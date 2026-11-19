# Деплой Sellgar и локальный Kubernetes

- Назначение: запускать инфраструктуру деплоя Sellgar в отдельной VM, используя K3s.
- Область выполненных шагов: установка Kubernetes, доступ к API, проверка базовых
  компонентов, подготовка образов общей инфраструктуры и dev-деплой админки.

## Принятая организация репозиториев

Уточнение пользователя 19 ноября 2026 года по примеру
`payment-terminal.app.ui/helm`: в репозитории приложения находится каталог
`helm/` рядом с `code/`, содержащий `values.app.yaml`, `dev/values.yaml`
и `prod/values.yaml`. Параметры ConfigMap, включая содержимое `config.js`,
задаются в values соответствующей среды. Каталог `deploy/` и собственные
Kubernetes templates в приложении не создаются.

Общие шаблоны Deployment, Service, Ingress и ConfigMap принадлежат
переиспользуемому chart `sellgar.infrastructure/charts/application`.

Репозиторий инфраструктуры: `git@github.com:pyatakovvg/sellgar.infrastructure.git`.
Он хранит желаемое состояние развёртываний и подготовку серверов:

```text
sellgar.infrastructure/
├── ansible/
├── bootstrap/
├── charts/
│   └── application/
└── environments/
    ├── dev/
    │   ├── services/
    │   │   └── admin-ui/
    │   │       └── application.yaml
    │   └── platform/
    └── prod/
        ├── services/
        │   └── .gitkeep
        └── platform/
```

`admin-ui/` содержит подключение админки; остальные сервисы подключаются
по той же схеме. Prod-сервисы пока не подключены.
`application.yaml` указывает Argo CD источники chart и values, зафиксированные
ревизии, namespace назначения и выбранный digest образа из CI в Helm parameters.
Общие values и настройки среды принадлежат приложению; их копии
в инфраструктурном репозитории не создаются. Argo CD получает общий chart
из инфраструктуры, а `helm/values.app.yaml` и `helm/<environment>/values.yaml`
из репозитория приложения.

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
Общий chart приложения подключён через Argo CD v3.6.2. Админка развёрнута
одной репликой в `sellgar-dev`, ingress — `http://dev.sellgar.io/admin/`.
Витрина развёрнута на `http://dev.sellgar.io/` по той же схеме, одной репликой. По решению
пользователя от 19 ноября 2026 года backend остаётся отдельным этапом:
до его подключения корень витрины возвращает 503, `/healthz` проверяет Next.js.
Конфигурация подключений находится в инфраструктуре:
`environments/dev/services/<admin-ui|storefront>/application.yaml`. Chart, values и образ
зафиксированы по SHA/digest; CI пока не обновляет инфраструктурный Git автоматически.
TLS, операторы и deployment остальных сервисов пока не подключены.

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

Для доступа к GitHub через VPN хоста MTU интерфейса VM `enp1s0` закреплён
в 1380; MTU Flannel и новых pod — 1330. Исходник netplan и инструкция
находятся в `infrastructure/sellgar.infrastructure/bootstrap/local-vm/`
и `bootstrap/README.md`. После изменения MTU K3s перезапущен с разрешения
пользователя; готовность узла и Git clone из repo-server проверены.

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
автоматическое обновление инфраструктурного Git из CI, TLS, операторы хранилищ,
мониторинг и deployment остальных сервисов. GitOps и dev-деплой админки
уже подключены; детали — в `infrastructure/sellgar.infrastructure/docs/admin-ui.md`.

## Источники

- [Структура GitOps-репозиториев: Flux](https://fluxcd.io/flux/guides/repository-structure/)
- [Разделение исходников и конфигурации: Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Chart и values из разных репозиториев: Argo CD](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/)
- [Установка и конфигурация K3s](https://docs.k3s.io/installation/configuration)
- [Встроенный etcd](https://docs.k3s.io/datastore/ha-embedded)
- [Доступ к кластеру](https://docs.k3s.io/cluster-access)
- [Шифрование Secrets](https://docs.k3s.io/security/secrets-encryption)

## Gateway rollout (2026-11-19)

- Scope: Admin/Client/Socket gateway images, CI, Helm values and Ingress, plus
  PostgreSQL/RabbitMQ/MinIO in the existing dev K3s VM. Fresh PVCs, no host data migration.
- All application repos own `code/`, root Dockerfile and `.github/`, and `helm/`
  values. Shared chart remains in infrastructure. Working branch is development.
- External routing: `http://dev.sellgar.io/api/admin` and `/api/client`, with
  Traefik StripPrefix; `/socket.io/*` retains channel paths. One replica per gateway.
- Server storefront uses `http://client-gateway` (Service port 80, target port 4030); browser uses public
  `/api/client`. URL resolution preserves prefixes for requests and file links.
- Secret bootstrap is `infrastructure/sellgar.infrastructure/bootstrap/dev/`:
  passwords/signing secrets are generated directly in Kubernetes; app ConfigMaps
  contain no secret values. Private images use the `ghcr-pull` Secret.
- Socket owns database `socket_srv`, schema created by a migration Job before rollout.
  Business domain services are a separate deployment stage; gateway health alone
  does not prove catalog, auth, cart or file APIs work end to end.

- Public image URL uses the existing Media `/images/:fileUuid` contract on
  `http://dev.sellgar.io/images`. Media service/Ingress is not deployed at the
  gateway stage, so image delivery remains part of the backend rollout.

Verification at rollout: gateway images are tested in isolated containers with
real RabbitMQ, Socket additionally with PostgreSQL and all six migrations; no
working host volumes are reused. Client tests pass 44/44, Socket 26/26, frontend
15/15; Admin has one existing RealtimeController fixture failure (61/62 pass),
which does not involve modified deployment/health code and is not changed here.
All three image build/smoke/publish workflows passed; Admin registry publication
required a second attempt after transient `denied`, with Actions Admin access
already present. Socket physical channel paths pass WebSocket upgrade/auth refusal
through Traefik; authenticated business flows still require Identity and domain
service deployments.
