---
name: fe-application-structure
description: >-
  Определяет владельцев и границы web frontend: application host, маршруты, экраны,
  framework-единицы, view, controllers, Context/Provider и shared packages. Использовать
  при разработке, миграции и аудите связей приложения; не применять к backend и mobile.
---

# Структура frontend-приложения

## Контракт приложения

Прочитай действующие frontend-инструкции, manifests, entrypoints и public API используемого framework. Определи host и модель исполнения: client/server rendering, маршруты, runtime units и управление состоянием. Имена каталогов и framework version получай из проекта; не вводи структуру соседнего приложения по аналогии.

При обычной feature-задаче используй активный runtime. Миграцию выполняй по явному scope, с установленными source/target и сохранёнными гарантиями. Наличие новой dependency или playground не доказывает завершённый cutover.

## Владельцы

| Роль | Ответственность |
|---|---|
| Application host | Bootstrap, dependency composition, маршруты, runtime configuration и политики приложения |
| Экран/framework-единица | Пользовательский сценарий, loader/action, локальные controllers и content |
| Вложенный workflow | Собственные параметры, lifecycle и связь с navigation/shell по контракту framework |
| Embedded runtime unit | Переиспользуемый сценарный блок с самостоятельным lifecycle |
| Layout | Shell, размещение и допустимые layout-owned providers |
| Domain package | Предметные Entity, ports, services, adapters и границы внешних данных |
| Presentation package / UI kit | Общие визуальные абстракции без сценарных бизнес-правил |

Это роли, а не обязательные названия пакетов. Создавай новую границу только при установленной ответственности и потребителе.

Для domain используй [fe-domain-structure](../fe-domain-structure/SKILL.md), для framework-единицы — [fe-module-create](../fe-module-create/SKILL.md), для React-тела — [fe-react-component-structure](../fe-react-component-structure/SKILL.md), для общего kit API — [ui-kit-component](../ui-kit-component/SKILL.md).

## Поток данных и состояния

До декомпозиции view определи владельца данных, сценарного состояния и команд. Controller/use case управляет предметным сценарием; view связывает framework data/events с presentation. Не размещай HTTP и успешные бизнес-последствия случайно внутри локального visual child.

Context/Provider нужен при доказанной общей области доступа или lifetime. Установи scope, создание/освобождение, изоляцию экземпляров, SSR/hydration и обновление данных. Используй готовый framework-механизм, если он покрывает контракт. Не создавай Provider только ради замены одного прямого контракта элемента коллекции.

Если component skill требует готовый controller/context, сначала спроектируй эту application-границу здесь или в framework unit. Не заставляй компонент изобретать отсутствующий механизм. Перенос state не должен менять initial value, reset semantics, lifetime или доступ нескольких экземпляров.

Публичные consumers зависят от фасадов. Private child, controller и adapter остаются у владельца; повторное использование не легализует deep import. Сбой framework исправляй у владельца, если это входит в scope, а не бесконтрольно обходи в каждом экране.

## Проверка и миграция

Проверь затронутую цепочку host → unit → controller/port → view. При маршрутизации учти direct URL, переходы, Back/Forward, параметры и восстановление состояния. При изменении lifecycle — cleanup, изоляцию и повторное открытие; при SSR — согласованную начальную модель.

Проверки выбирай по изменённому обещанию, используя локальные scripts и [dev-runtime](../../runtime/dev-runtime/SKILL.md). Один migrated экран или удачный render не доказывает cutover всего приложения.

В аудите не изменяй код. Сообщи область, владельцев, найденные нарушения с file:line и непроверенные сценарии.
