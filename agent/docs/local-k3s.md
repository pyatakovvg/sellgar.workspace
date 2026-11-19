# Деплой Sellgar и локальный Kubernetes

- Назначение: запускать инфраструктуру деплоя Sellgar в отдельной VM, используя K3s.
- Область выполненных шагов: установка Kubernetes, доступ к API, проверка базовых
  компонентов и подготовка образов общей инфраструктуры.

## Принятая организация репозиториев

Решение принято пользователем 18 ноября 2026 года.

Helm chart каждого сервиса хранится в его собственном репозитории,
в `deploy/helm/`. Сервис владеет шаблонами запуска, значениями по умолчанию,
схемой параметров и специфическими ресурсами, включая Job миграций при необходимости.
Общая логика шаблонов переиспользуется через версионируемую Helm-библиотеку.

Репозиторий инфраструктуры: `git@github.com:pyatakovvg/sellgar.infrastructure.git`.
Он хранит желаемое состояние развёртываний и подготовку серверов:

```text
sellgar.infrastructure/
├── ansible/
├── bootstrap/
└── environments/
    ├── dev/
    │   ├── services/
    │   │   └── cart/
    │   │       ├── application.yaml
    │   │       └── values.yaml
    │   └── platform/
    └── prod/
        ├── services/
        │   └── cart/
        │       ├── application.yaml
        │       └── values.yaml
        └── platform/
```

`cart/` показывает единый способ размещения конфигурации каждого сервиса.
`application.yaml` указывает Argo CD источник chart, зафиксированную ревизию
и namespace назначения. `values.yaml` задаёт параметры окружения: digest образа,
ресурсы, настройки реплик или autoscaling, домены, подключения и ссылки на Secrets.
Argo CD получает chart из репозитория сервиса, а значения — из инфраструктурного
репозитория; копии шаблонов сервиса в инфраструктурном репозитории не создаются.

`platform/` содержит описание общих компонентов: PostgreSQL, RabbitMQ, MinIO, TLS
и мониторинга. `ansible/` отвечает за подготовку серверов и K3s,
`bootstrap/` — за первоначальную настройку GitOps.

По решению пользователя от 18 ноября 2026 года объектным хранилищем остаётся
MinIO. Для `dev` и `prod` его конфигурация относится к `platform/` соответствующей
среды. Переход на внешнее S3-хранилище отложен; замена текущего storage-адаптера
Media в этот этап не входит.

Используются две среды: `dev` и `prod`, отдельные каталоги в одном репозитории.
Рабочая ветка — `development`, ветка выпуска — `master`.
Для `dev` используется локальная VM; для `prod` запланирован VPS.
Каждая среда имеет отдельные настройки и Secrets. Секретные значения в Git
допускаются только в зашифрованном виде.

При продвижении выпуска из `dev` в `prod` сохраняется проверенный digest образа;
повторная сборка образа для production не выполняется. Ревизия chart также
фиксируется, чтобы состав развёртывания был воспроизводимым.

Этот раздел фиксирует принятый контракт размещения файлов. Инфраструктурный
репозиторий клонирован в `infrastructure/sellgar.infrastructure`;
его [README](../../infrastructure/sellgar.infrastructure/README.md) описывает
текущее состояние. В нём подготовлены inventory образов для `dev` и `prod`.
MinIO и `mc` опубликованы в GHCR, PostgreSQL и RabbitMQ используются из upstream
registries. Все образы закреплены по digest и проверены на пустых временных
хранилищах. Данные приложений не переносятся.

Инфраструктурный репозиторий зарегистрирован как submodule workspace.
Inventory опубликован в `master` и `development`; рабочий checkout использует
`development`.
Helm charts, операторы и конфигурация Argo CD пока не реализованы.

## Виртуальная машина

| Параметр | Значение |
|---|---|
| Libvirt connection | `qemu:///system` |
| VM | `sellgar-k3s` |
| ОС | Ubuntu Server 24.04.5 LTS |
| CPU / RAM | 4 vCPU / 16 ГиБ |
| Диск | 120 ГиБ, qcow2, pool `default` |
| Сеть | NAT `default`, DHCP reservation `192.168.122.10` |
| SSH | `sellgar@192.168.122.10`, отдельный ключ |

Локальные параметры VM, SSH-ключ и kubeconfig хранятся в
`~/.local/share/sellgar/vm/sellgar-k3s/`. Эта папка находится вне Git.

```bash
VM_STATE="$HOME/.local/share/sellgar/vm/sellgar-k3s"

ssh -i "$VM_STATE/id_ed25519" \
  -o UserKnownHostsFile="$VM_STATE/known_hosts" \
  sellgar@192.168.122.10
```

VM запускается вручную через libvirt; автозапуск VM при загрузке хоста не включён.
Внутри VM сервис K3s должен запускаться через systemd автоматически.

## Конфигурация K3s

Версия установки: `v1.37.2+k3s1`, выбранная из официального stable-канала
18 ноября 2026 года. При воспроизведении установки версия задаётся явно через
`INSTALL_K3S_VERSION`; автоматическое обновление не настроено.

Файл внутри VM: `/etc/rancher/k3s/config.yaml`, владелец `root`, режим `0600`:

```yaml
node-name: sellgar-k3s
node-ip: 192.168.122.10
advertise-address: 192.168.122.10
tls-san:
  - 192.168.122.10
cluster-init: true
secrets-encryption: true
write-kubeconfig-mode: "0600"
```

Хранилище Kubernetes — встроенный etcd. Используются поставляемые с K3s
CoreDNS, Traefik, metrics-server, ServiceLB и local-path-provisioner.
Pod CIDR — `10.42.0.0/16`, Service CIDR — `10.43.0.0/16`.
При установке эти диапазоны проверены на отсутствие пересечений с сетями хоста.

Local-path хранит данные на диске этой VM. Снимки etcd относятся к состоянию
Kubernetes; данные PersistentVolume требуют отдельного резервного копирования.

## Управление с хоста

Для кластера используется отдельный клиент `kubectl v1.37.2`:
`$VM_STATE/bin/kubectl`. Системный клиент хоста не обновляется.

Kubeconfig: `$VM_STATE/kubeconfig`, режим `0600`, endpoint
`https://192.168.122.10:6443`. Это административный доступ к кластеру;
содержимое файла нельзя публиковать или добавлять в Git.

```bash
VM_STATE="$HOME/.local/share/sellgar/vm/sellgar-k3s"

"$VM_STATE/bin/kubectl" --kubeconfig "$VM_STATE/kubeconfig" get nodes -o wide
"$VM_STATE/bin/kubectl" --kubeconfig "$VM_STATE/kubeconfig" get pods -A
```

Проверки внутри VM:

```bash
sudo systemctl status k3s --no-pager
sudo k3s kubectl get nodes -o wide
sudo k3s secrets-encrypt status
sudo k3s etcd-snapshot ls
```

Контекст в этом kubeconfig называется `sellgar-local`.
Копия kubeconfig на хосте требует обновления при изменении сертификатов;
источник внутри VM — `/etc/rancher/k3s/k3s.yaml`.

## Проверка установки 18 ноября 2026 года

Проверено на работающем кластере:

- Узел `sellgar-k3s` — `Ready`, роли `control-plane,etcd`; systemd-сервис активен
  и включён в автозапуск внутри VM.
- API `/readyz` отвечает `ok` при подключении с хоста через kubeconfig и TLS.
- CoreDNS, Traefik, ServiceLB, metrics-server и local-path-provisioner готовы.
  `kubectl top nodes` возвращает метрики.
- `k3s secrets-encrypt status` подтверждает включённое шифрование Secrets.
- Создан локальный снимок etcd `bootstrap-sellgar-k3s-1795026615`.
- Временное приложение доступно через Traefik. Проверены разрешение
  внутрикластерного DNS-имени и HTTP-запрос через Service.
- PVC выделен через `local-path`; данные, записанные одним pod'ом, прочитаны
  другим pod'ом с тем же PVC.
- Rolling restart двух реплик завершился успешно. Во время проверки все
  40 HTTP-запросов через ingress получили ожидаемый ответ без ошибок.
- Масштабирование временного Deployment с двух до трёх реплик завершилось
  состоянием `3/3 Ready`.

Временные ресурсы проверки и их PersistentVolume удалены после проверки.
Манифесты и результат HTTP-проверки сохраняются локально в папке VM,
в `verification/` и `rollout-check.json`.

## Следующие этапы

Отдельными этапами настраиваются воспроизводимое provisioning через Ansible,
GitOps через Argo CD, Helm charts, CI и registry, TLS, операторы хранилищ
и мониторинг. Деплой сервисов Sellgar выполняется после настройки этой цепочки.

## Источники

- [Структура GitOps-репозиториев: Flux](https://fluxcd.io/flux/guides/repository-structure/)
- [Разделение исходников и конфигурации: Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Chart и values из разных репозиториев: Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/)
- [Установка и конфигурация K3s](https://docs.k3s.io/installation/configuration)
- [Встроенный etcd](https://docs.k3s.io/datastore/ha-embedded)
- [Доступ к кластеру](https://docs.k3s.io/cluster-access)
- [Шифрование Secrets](https://docs.k3s.io/security/secrets-encryption)
