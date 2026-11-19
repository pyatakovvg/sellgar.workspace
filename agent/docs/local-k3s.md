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
Для админки `application.yaml` указывает постоянный Helm OCI repository своей среды.
CI сервиса публикует туда пакет с проверенным image digest и конфигурацией из того же
source commit; Argo CD отслеживает новые версии. Коммиты в infrastructure на каждый
выпуск админки не нужны. Остальные приложения пока используют прежний multi-source
механизм с chart/values по SHA и image digest в параметрах Application.
Общие values и настройки среды принадлежат приложению, их копии в инфраструктурном
репозитории не создаются. Общий delivery action и chart находятся в infrastructure;
в CI они подключаются по закреплённому commit.

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
Постоянные подключения находятся в инфраструктуре:
`environments/dev/services/<admin-ui|storefront>/application.yaml`. Админка получает
версии из Helm OCI; storefront пока использует закреплённые SHA/digest.
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
- Server storefront uses `http://client-gateway:8080` (Service and target port 8080); browser uses public
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

Internal application HTTP ports are standardized on 8080 for every Kubernetes
environment, including Services, containers, probes and internal API URLs.
Public Ingress remains on HTTP/HTTPS; infrastructure protocols retain their ports.

## Identity rollout (2026-11-19)

- Identity follows the same CI → GHCR digest → Argo CD scheme. Source/config are
  in `backend/service/sellgar.identity.service/code` and service-owned `helm/`.
- `dev-identity-service` uses one replica, internal HTTP 8080 and no Ingress;
  domain commands remain in `identity_srv_command_queue` on RabbitMQ.
- CloudNativePG manages separate `identity_srv` database/login from
  `identity-database` Secret; database reclaim policy retains data. Identity keys
  live in `identity-auth`; existing platform Secrets are preserved.
- Migration Sync hook applies six migrations, including initial base-table
  creation for empty installations, before Deployment. Synchronize is disabled.
- Fresh deployment except the explicitly requested base administrator and person
  profile imported from local Identity. Previous sessions and other local data
  are not imported. Legacy password HMAC key retains credential compatibility;
  session/fingerprint keys are newly generated.
- CI checks unit tests, empty database + repeat migrations, RMQ guest lifecycle
  and readiness loss after broker disconnect. `/health` checks DB and RMQ consumer.
- Prod is still not deployed. Product/Store/Cart and remaining domain services
  are subsequent stages; catalog/cart remain unavailable until they are connected.
- Infrastructure specifics: `infrastructure/sellgar.infrastructure/docs/identity-service.md`.

Identity acceptance: CI run `44604246244` passed build/smoke/publish; deployed
source `542f1b8b5fa3fdcb87decba024d54eaf812bf34a`, image digest
`sha256:afc69bab1c258975889e8bdd6ab47cb8412950df1e3bedde2552806af046afad`.
All six migrations are recorded; base admin and one profile imported with
matching credential hash/key. All dev Applications are Synced/Healthy; Identity
Deployment is 1/1 with internal Service 8080. Actual Client gateway HTTP checked
guest initialize 201 + HttpOnly cookie, current 200, wrong device 401, invalid
login 401 preserving guest, logout 201 and subsequent current 401. Temporary
verification sessions were removed; real newly created dev sessions remain.
Personal PostgreSQL user `sellgar` also has access to `identity_srv` through the
existing localhost tunnel, using its own credential (not the app credential).

Admin browser sign-in was verified after the Identity rollout. The Admin gateway
Identity command client had its RabbitMQ URLs outside `options`, so Nest ignored
the configured broker. They now reside in `options.urls`; regression test failed
before the fix and passes after. All 14 auth/session tests run in the image build.
CI `44607457600` passed; source `6b642930a68c065ef31e881be22f19aa52a73e71`,
image `sha256:be998b23a4980c3463cee1757372878a2a604480f329857febc49de05450bdf0`.
Argo CD rolled out the updated admin gateway. In-app browser login with the
imported administrator reached `/admin` dashboard and displayed the correct
profile; the password was not changed or stored in repository files.

## Shop rollout (2026-11-19)

- Shop переведён на принятую структуру `code/`, корневые Dockerfile/CI и
  service-owned `helm/`. Общий chart остаётся в infrastructure.
- `dev-shop-service`: одна реплика, внутренний HTTP/Service 8080, без Ingress.
  Доменные команды остаются в RabbitMQ; внешний API — существующая ветка
  `/v2/shops` Admin gateway.
- CloudNativePG создал отдельные login/database `shop_srv`, Secret
  `shop-database`; reclaim policy сохраняет базу. База развёрнута с нуля,
  локальные магазины не импортированы. Права личного `sellgar` не менялись.
- Migration Sync Job применяет девять миграций перед Deployment, synchronize
  отключён. `.env` поступает из ConfigMap, пароли — через Secret env refs.
- `@sellgar/outbox` собирается и входит в runtime-образ как библиотека процесса
  Shop. Отдельный сервис или копия реализации outbox не создавались.
- CI `44609854076` успешно завершил build/smoke/publish. Source:
  `bbe16ca9b2c757951dcedd32d80d249ec2a54348`; образ:
  `sha256:eeff8f625e4057b2488e9574d205149e48cc878fe7c30119cafddc52d623ec0b`.
- Проверены 53 unit-теста; 11 DB integration-тестов пропущены без их env-флага.
  Отдельный image smoke с пустыми PostgreSQL/RabbitMQ проверил все миграции и
  повторный запуск, RMQ create/read/update/search, ответы 400/409 и публикацию
  `shop.created` → `shop.updated` с версиями 1 → 2. Остановка проверочного
  RabbitMQ переводила health в 503. Рабочие volumes не использовались.
- Argo CD: Synced/Healthy; Shop Deployment 1/1. Prod остаётся не развёрнутым.
  Детали: `infrastructure/sellgar.infrastructure/docs/shop-service.md`.

Браузерная проверка `/admin/shops`: создан `Магазин разработки`
(`9b17e18c-913c-4fea-b311-e63bda0f3790`) с явно тестовыми реквизитами, затем
повторно открыт из списка после перезагрузки страницы. Обнаруженный блокирующий
дефект формы `Missing uuid` исправлен в админке: create route теперь создаёт
магазин, edit route сохраняет прежнюю семантику обновления. Все 16 тестов формы
и сборка админки прошли; CI `44612347757` также завершился успешно. Source
админки `bcfbcea9ca44663235f9cd6e01713e050a6ad83f`, digest
`sha256:6e2a5b074898ebf646de8234cc649f522bbd8b7019d29017eb7418f243c5febe`.
Оставшийся frontend-дефект: список магазинов не получает новую строку сразу
после закрытия формы, пока страницу не обновить. Автоматическая синхронизация
списка требует отдельной доработки; backend-запись и повторное чтение проверены.


## Product rollout (2026-11-20)

- Product переведён на `code/` (Yarn root, `service`, `_service`, nested outbox),
  корневые Dockerfile/CI и service-owned `helm/`. Legacy не включён в Docker context.
- `dev-product-service`: одна реплика, HTTP/Service 8080, без Ingress. Очереди
  `product.v2.commands` и `product.v2.events`, exchange `event.exchange` сохранены.
- CloudNativePG создал отдельные database/login `product_srv_v2` из Secret
  `product-database`, без superuser и с retain reclaim policy. Семь миграций
  применены Sync Job до старта Deployment. Локальные товары не импортировались,
  права личного `sellgar` не менялись.
- `.env` монтируется из ConfigMap. Пароли поступают из Secret env refs;
  `PRODUCT_AMQP_URL` собирается Kubernetes env expansion из secret env-полей.
- В readiness проверяются PostgreSQL и оба RMQ consumer. Runtime остаётся
  non-root/read-only; PostgreSQL 16 присутствует только в test stage Dockerfile.
- 104 теста проходят, в том числе SQL-проекции изображений и четыре новых
  readiness-теста. Семь FTS-тестов по env-флагу не запускались; реальный prefix
  search проверен production-image smoke с PostgreSQL 16.
- Smoke проверил пустую базу, семь миграций и их повторный запуск, создание и
  изменение товара, три варианта, image projection из File events, ошибки 400/409,
  четыре полных outbox snapshots в порядке версий 1 → 4 и health 503 после
  отключения проверочного RabbitMQ. Рабочие volumes не использовались.
- CI `44614717883` завершился успешно: source
  `a76bd00eaedd8cfa84752c21771789b20fcb7d4c`, digest
  `sha256:f31bb58d3850341588dc39e3cfe0a21eab9b6f9d759cdc4744308b48e2d163a7`.
  Argo CD — Synced/Healthy, Deployment 1/1; прод не развёрнут.
- Через dev-админку созданы бренд `dev-brand`, шаблон
  `1035968a-c159-44f0-b62c-ebc91ac2a5db` и тестовый товар
  `6b898082-fcdf-4a35-94ee-b248c23ac6b6` с одним вариантом. После перезагрузки
  список показывает товар; карточка повторно открыта из списка с сохранёнными
  брендом, шаблоном и описаниями. В реальной базе outbox-событие имеет published.
- Отдельный frontend-дефект: список товаров, как и магазинов, не обновляется
  сразу после создания. Store/File/Media ещё не развёрнуты; витрина и загрузка
  реальных изображений требуют следующих этапов.
- Подробности: `infrastructure/sellgar.infrastructure/docs/product-service.md`.

## Автоматическая доставка админки через Helm OCI, 20 ноября 2026

Прежний CI публиковал образ без передачи версии для deployment. Исправленная цепочка:
`development push → build → smoke → image publish → Helm package publish → Argo CD`.
Настройки `helm/` остаются у сервиса. Kubernetes credentials в GitHub не передаются.
Prod-пакет может опубликовать только ручной workflow из master с проверенным
release-кандидатом, без пересборки image; prod-кластер ещё не подключён.

CI `44622698311`, source `510150db22a06e7e092e37c868dd55a344d94125`: все четыре jobs
успешны. Argo CD выбрал Helm `0.44622698311.1`, выполнил rollout image
`sha256:46a32899d0f5efdf760ef28393021707dacf44031074bfad2ec9b466d953c2b6`.
Состояние Synced/Healthy, готовность 1/1. Проверены config.js и `/admin/templates`
во встроенном браузере. Дополнительный повтор job отклонён auto-review и не выполнялся;
обнаружение следующей публикации отдельно не проверялось.

Общий механизм: `infrastructure/sellgar.infrastructure/docs/helm-delivery.md`.
Остальные сервисы пока сохраняют прежнюю доставку.
