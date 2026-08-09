# React Component Code Rules

- Статус: draft
- Тип: обязательные правила разработки
- Назначение: правила написания кода внутри React-компонента.

Этот документ описывает, как организовывать код внутри файла компонента. Правила
дополняют [view-component-rules.md](view-component-rules.md): тот документ
описывает границы компонента и структуру каталогов, этот документ описывает
внутреннюю организацию реализации.

## Применение

Правила применяются к новому коду и к компонентам, которые затронуты текущей
задачей. Не превращай локальную правку в механическое переписывание всего
package только ради соответствия документу.

Если файл уже нарушает правила, но задача касается его поведения, приведи в
порядок ту часть, которую читаешь и меняешь. Широкая нормализация import style,
namespace style или разбиение перегруженных компонентов должна быть отдельной
явной задачей.

Этот документ не заменяет документацию конкретного runtime, framework или
domain слоя. Если типизация, loader/action contract, navigation, request flow
или controller lifecycle уже описаны в документации соответствующего runtime,
применяй runtime-документ. Здесь описывается только организация кода внутри
React-компонента.

## Imports

RCC-01. Imports группируются по ownership и расстоянию до компонента.

Порядок должен помогать понять, от чего зависит компонент:

1. workspace/package imports;
2. React и React-adjacent imports;
3. package-local business/application imports;
4. sibling/child imports текущей view-композиции;
5. library для сборки CSS-классов, если используется;
6. CSS module.

Группы разделяются пустой строкой. Внутри группы не нужно делать механическую
alphabetical sorting, если она скрывает смысловую близость импортов.

RCC-02. Import классифицируется по алгоритму.

Для каждого import ответь по порядку:

1. Это npm package или workspace alias? Отправь в `workspace/package imports`.
2. Это React или React-bound library? Отправь в `React и React-adjacent`.
3. Это controller, request, local hook, feature constant, schema или mapper
   текущего package? Отправь в `package-local business/application`.
4. Это sibling/child component или view-only helper текущей композиции? Отправь
   в `view-композицию`.
5. Это `classnames`, `clsx` или аналог? Поставь перед CSS module.
6. Это CSS module? Он должен быть последним import.

Если import подходит под несколько пунктов, выбирай первый подходящий пункт.
Например, domain entity из workspace alias остается в `workspace/package
imports`, даже если используется как business type.

RCC-03. Workspace/package imports идут первыми.

Сюда относятся imports из npm package или workspace alias: UI/design, runtime,
domain, kit, icons и другие внутренние libraries. Эти imports всегда стоят выше
React-группы, даже если это `type import` из domain.

Пример:

```ts
import { Form } from '@app/design';
import type { ItemEntity } from '@app/domain';
import { Button } from '@ui/kit';
import * as AppRuntime from '@app/runtime';
```

RCC-04. React и React-adjacent imports отделяются от остальных.

`react`, form libraries, observers, animation adapters, validation resolvers и
другие React-bound packages читаются отдельной группой после внешних
package/alias imports.

Пример:

```ts
import React from 'react';
import * as RHF from 'react-hook-form';
import * as MobxReact from 'mobx-react';
```

RCC-05. Behavior API используется через namespace.

Не импортируй functions, hooks, helpers и library API как голые имена из React,
внешних libraries или локальных modules. В коде должно быть видно, кому
принадлежит API: `React.useEffect`, `React.useMemo`, `RHF.useFormContext`,
`RHF.Controller`, `MobxReact.observer`, `AppRuntime.useNavigate`,
`FV.toFormData`.

Плохо:

```ts
import { useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { toFormData } from './form-values.ts';
```

Хорошо:

```ts
import React from 'react';
import * as RHF from 'react-hook-form';
import * as FV from './form-values.ts';
```

Named imports допустимы для JSX-компонентов, типов, entities, value objects и
явных contract tokens. Они не должны делать чтение компонента мутным.

Для `@sellgar/kit` React-компоненты импортируй именованно, а hooks, helpers и
другой behavior API вызывай через namespace `Kit`. Если в одном файле нужны
оба вида API, используй две import-декларации: синтаксис, объединяющий namespace
и named imports в одной декларации, не существует.

```tsx
import * as Kit from '@sellgar/kit';
import { Typography } from '@sellgar/kit';

const { data } = Kit.useCellData<Entity>();

return (
  <Typography>
    <p>{data.name}</p>
  </Typography>
);
```

Если library export используется как JSX-component, но принадлежит API
behavior-library, он тоже остается за namespace:

```tsx
<RHF.Controller />
<Motion.Reorder.Item />
```

Для часто используемых libraries или локальных modules выбирай короткий
устойчивый namespace, если полное имя делает код тяжелым и сокращение не
теряет смысл. Аббревиатура должна читаться как имя владельца API, а не как
случайная буква.

Допустимые примеры: `RHF`, `Motion`, `MobxReact`, `AppRuntime`, `YR`, `FS`,
`FV`. `YR` может означать yup resolver, `FS` - form schema, `FV` - form
values. Нижний `fs` допустим только если в package уже есть такой устойчивый
стиль и он не конфликтует с платформенным `fs`.

Если namespace и вызываемый API повторяют один смысл, namespace нужно сократить:
`YR.yupResolver(...)` читается лучше, чем `YupResolver.yupResolver(...)`.

Не сокращай namespace, если:

- аббревиатура неочевидна без знания конкретного файла;
- она конфликтует с platform/API names;
- рядом уже есть другой module с похожим сокращением;
- полное имя лучше объясняет редкий или важный contract.

Не придумывай разные aliases для одного и того же module внутри одного package.

RCC-06. Package-local business/application imports идут перед view-композицией.

Сюда относятся imports из текущего feature/package, которые описывают сценарий
или правила component:

- controller interfaces;
- requests и mutations;
- feature hooks, которые получают или меняют данные;
- schema, validators, form mappers;
- feature constants, если они относятся к сценарию.

Domain entities, value objects и DTO из workspace aliases остаются в верхней
workspace/package группе. В package-local business/application группу они
попадают только если импортируются из локальных файлов текущего package.

Внутри business/application imports сохраняй порядок по business ownership, а
не по типу импорта, имени файла или каталогу:

1. local domain/value contracts, если они живут внутри текущего package;
2. controller/service interfaces, requests, mutations и data hooks;
3. feature constants;
4. local schema, validators, form mappers и value adapters.

Это одна крупная business-группа, но внутри нее могут быть смысловые подгруппы.
Разделяй их пустой строкой, когда без нее смешиваются разные владельцы:
local domain contract, controller/request contract, feature constants, local form
schema/mappers. Не делай разделение только потому, что импорт `type` или потому,
что файл лежит в другом каталоге.

Пример:

```ts
import { ItemControllerInterface } from '../classes/controller/item-controller.interface.ts';
import * as CreateItemRequest from '../requests/create-item.hook.ts';

import { ITEM_FORM_ID } from '../constants';

import * as FS from './schema.ts';
import * as FV from './form-values.ts';
```

RCC-07. Imports view-композиции группируются отдельно.

Сюда относятся sibling/child components и локальные view-only helpers текущей
композиции. Не смешивай их с business/application imports.

Пример:

```ts
import { Content } from './content';
import { Controls } from './controls';
```

Если sibling/child component импортируется, используй public entry его каталога:
`./content`, а не `./content/content.tsx`.

RCC-08. Type imports остаются в смысловой группе своего источника.

Не создавай отдельный общий блок type imports внизу файла. Если импорт нужен
только как type, используй `import type` или inline `type`, но оставляй его рядом
с imports того же ownership.

RCC-09. Library для сборки CSS-классов и CSS module образуют последнюю группу.

Если компонент использует `classnames`, `clsx` или похожую library для сборки
CSS-классов, импорт этой library ставится прямо перед CSS module. Они читаются
как одна группа, потому что используются вместе: library собирает className, а
CSS module дает имена классов. Между ними не ставится пустая строка.

Пример:

```ts
import cn from 'classnames';
import s from './default.module.css';
```

CSS module остается последним import. После CSS module не должно быть других
imports.

## Эталонные Import-Блоки

Простой view component:

```ts
import { Button } from '@ui/kit';

import React from 'react';

import s from './default.module.css';
```

Form component:

```ts
import { Form } from '@app/design';
import { Input } from '@ui/kit';

import React from 'react';
import * as RHF from 'react-hook-form';

import * as FS from './form.schema.ts';

import s from './default.module.css';
```

Component with package-local business contract:

```ts
import type { Entity } from '@app/domain';
import * as AppRuntime from '@app/runtime';

import React from 'react';
import * as RHF from 'react-hook-form';

import { EntityControllerInterface } from '../classes/controller/entity-controller.interface.ts';

import { ENTITY_FORM_ID } from '../constants';

import * as FS from './form.schema.ts';
import * as FV from './form-values.ts';

import { Fields } from './fields';

import s from './default.module.css';
```

Field component:

```ts
import { Form } from '@app/design';
import { Field, Input, Label } from '@ui/kit';

import React from 'react';
import * as RHF from 'react-hook-form';

import * as FS from '../../form.schema.ts';
```

## Основная Модель

RCC-10. `component.tsx` является точкой реализации компонента, а не контейнером
для всех локальных сущностей.

Файл должен оставаться читаемым как одна единица: входной contract, тело
компонента и JSX-композиция. Нельзя превращать `component.tsx` в склад из
types, constants, helpers, hooks и вложенных components.

RCC-11. Базовый состав `component.tsx` должен быть минимальным.

Обычный порядок:

1. imports;
2. props type/interface;
3. компонент;

Локальные constants, pure helpers и hooks допустимы в этом же файле только как
короткая implementation detail, которая не имеет самостоятельного смысла вне
компонента и не мешает читать основной сценарий.

RCC-12. Именованная локальная сущность должна получить место.

Если type, constant, helper или hook:

- занимает заметный объем;
- используется несколькими функциями;
- имеет собственные правила или edge cases;
- требует отдельного названия для понимания;
- может быть проверен или прочитан отдельно;
- начинает конкурировать с компонентом за внимание;

нужно проверить масштаб и ownership.

Для helper или hook допустим private companion-файл внутри каталога компонента.
Такой файл остается внутренней частью компонента и не экспортируется из public
`index.ts`, если не стал частью public contract.

- `*.hook.ts`;
- `*.helper.ts`.

Эти файлы не создают новый public API. Они нужны, чтобы разгрузить
`component.tsx`, сохранив ownership внутри каталога компонента.

Для type или constant отдельный файл на уровне одного компонента обычно
является плохим сигналом. Сначала проверь:

- можно ли оставить type или constant рядом с использованием;
- не должен ли он перейти в public contract компонента;
- не является ли он частью domain/shared слоя;
- не стала ли граница компонента слишком широкой.

RCC-13. Вложенный private component в `component.tsx` почти всегда является
ошибкой границы.

Если часть JSX можно назвать как отдельную мини-задачу, ей нужен собственный
каталог компонента по правилам [view-component-rules.md](view-component-rules.md).
Оставлять component-like функцию внутри файла можно только для очень маленького
адаптера к внешнему render API, который не имеет своего состояния, styles и
contract.

RCC-14. Компонент должен иметь один основной сценарий.

Внутри компонента не должно быть нескольких независимых сценариев, которые можно
назвать отдельно. Если такие сценарии появились, нужно выделить дочерний
компонент, локальный hook или helper.

RCC-15. Контракт компонента описывается до реализации.

Props должны быть объявлены рядом с компонентом и показывать его public contract.
Если props выглядят как набор случайных технических флагов, значит граница
компонента выбрана плохо.

RCC-16. Props называются по смыслу действия или данных.

Плохо:

- `onClick`, если действие имеет конкретный смысл;
- `value1`, `value2`;
- `data`, если данные имеют предметное имя;
- `mode`, если набор режимов не очевиден.

Хорошо:

- `onDelete`;
- `onCopy`;
- `items`;
- `selectedId`;
- `inProcess`.

## Локальные Types, Helpers И Hooks

RCC-17. Локальный type должен обслуживать текущий компонент.

Если type обслуживает только один компонент, он должен быть рядом с местом
использования. Props type/interface объявляется перед компонентом. Небольшие
локальные types, которые нужны только helper или handler, объявляются рядом с
этой локальной сущностью.

Не создавай отдельный `*.type.ts` только для того, чтобы разгрузить
`component.tsx`. Если type стал объемным или смысловым, сначала проверь
ownership:

- не слишком ли широкий компонент;
- не нужно ли вынести helper/hook вместе с его private type;
- не стал ли type частью public contract;
- не относится ли type к domain/shared слою.

Если type становится частью public contract каталога или используется
несколькими компонентами, его нужно вынести и экспортировать осознанно.

RCC-18. Pure helper не должен жить в JSX.

Фильтрация, сортировка, нормализация, поиск, построение path/name и другие
чистые вычисления не должны жить прямо в JSX. Если вычисление имеет смысл, оно
должно получить имя.

Если helper короткий и обслуживает только текущий компонент, он может остаться
рядом с ним. Если helper начинает задавать отдельные правила чтения,
преобразования или выбора данных, вынеси его в private файл внутри каталога
компонента.

RCC-19. Helper не должен скрывать side effect.

Функция вне компонента должна быть чистой, если по имени не ясно обратное.
Вызовы submit, navigation, mutation, setState, form methods и внешних services
не должны маскироваться под обычный data helper.

RCC-20. Локальный hook допустим, когда он называет связанный набор hooks.

Локальный hook нужен, если несколько hooks и derived values образуют отдельную
мини-задачу. Если hook достаточно значим, чтобы получить собственное имя, чаще
всего ему нужен отдельный private файл внутри каталога компонента. Не создавай
hook только ради переноса строк из компонента.

## Тело Компонента

RCC-21. Внутри компонента соблюдай стабильный порядок.

Рекомендуемый порядок:

1. framework/context hooks;
2. data hooks;
3. form/field hooks;
4. derived values;
5. handlers;
6. effects;
7. early return, если он есть;
8. основной `return`.

RCC-22. Derived values должны быть названы до JSX.

Если значение используется в JSX и требует вычисления, дай ему имя до `return`.
JSX должен читать готовые значения, а не содержать вычислительную логику.

RCC-23. `React.useMemo` не заменяет понятное имя.

`React.useMemo` нужен для контроля пересчета или стабильности ссылки. Он не
должен использоваться только как способ спрятать сложное выражение. Сначала
назови вычисление, затем решай, нужен ли `React.useMemo`.

RCC-24. `React.useEffect` должен объяснять side effect, а не синхронизировать все со всем.

Effect допустим, когда есть внешний side effect или необходимость синхронизации
с внешним источником. Если effect только чинит неудачный flow данных, сначала
проверь default values, input data, props и ownership.

## Handlers

RCC-25. Handler называется по пользовательскому действию.

Плохо:

- `handleClick`;
- `handleChange`;
- `onSubmit`;
- `onAction`.

Хорошо:

- `handleAddItem`;
- `handleRemove`;
- `handleCopy`;
- `handleSelectItem`;
- `handleSubmit`.

Общее имя допустимо только если компонент сам является generic control и не
знает предметного действия.

RCC-26. Handler должен быть коротким и однонаправленным.

Handler должен:

- прочитать входные данные события;
- выполнить одну операцию;
- вызвать named helper или command;
- завершиться.

Если handler содержит несколько веток, преобразований и side effects, выдели
named helpers или пересмотри границу компонента.

RCC-27. Не создавай inline handler с логикой в JSX.

В JSX допустим простой прокид:

```tsx
onClick={handleRemove}
```

или короткая привязка аргумента:

```tsx
onClick={() => handleRemove(item.id)}
```

Если внутри callback появляется условие, преобразование данных или несколько
операций, handler должен быть назван до `return`.

## JSX

RCC-28. JSX описывает композицию, а не вычисления.

В JSX допустимы:

- компоненты;
- простые props;
- короткие условия видимости;
- map по уже подготовленной коллекции.

В JSX не должны жить:

- сложная фильтрация;
- сортировка;
- построение больших объектов;
- поиск зависимых сущностей;
- длинные ternary expressions;
- inline styles без локальной причины.

RCC-29. Повторяющийся JSX должен получить имя.

Если одинаковая форма поля, строки, item или action повторяется, не копируй
разметку. Сначала определи, это helper render-функция, дочерний компонент или
отдельная единица композиции.

RCC-30. Render callback не должен становиться компонентом внутри компонента.

Если render callback разрастается и содержит собственные условия, подписи,
ошибки, actions и layout, эту часть нужно вынести в дочерний компонент или
локальный helper. Render callback должен оставаться адаптером к API внешнего
компонента.

RCC-31. Inline style запрещен как замена локального style file.

Inline style допустим только для значения, которое действительно вычисляется в
runtime и не может быть выражено классом. Layout, spacing, alignment и visual
state должны жить в style module компонента.

## Формы И Поля

RCC-32. Поле формы является отдельной мини-задачей, если у него есть label,
control, error и mapping.

Если компонент содержит несколько полей с одинаковым шаблоном, поле или группа
полей должны получить named component/helper. Не размазывай одинаковый
`label/content/error` по большому JSX.

RCC-33. Path к полю должен быть назван, если он вычисляется.

Строки вида ``items.${index}.name`` допустимы прямо в JSX только в простых
случаях. Если path используется несколько раз, зависит от scope или требует
type assertion, вынеси его в named value до `return`.

RCC-34. Form state не должен протекать в несвязанные части компонента.

Компонент должен читать только те form values, которые нужны его мини-задаче.
Если один компонент начинает смотреть на несколько независимых частей формы,
это признак перегруза или неверного ownership.

## Признаки Перегруза

RCC-35. Компонент перегружен, если в нем смешались разные роли.

Признаки:

- компонент одновременно получает данные, преобразует их, управляет списком и
  рисует несколько независимых блоков;
- JSX занимает большую часть файла и содержит много вложенных callbacks;
- handlers знают слишком много о структуре данных;
- helper names описывают технические шаги, а не смысл;
- props API растет быстрее, чем задача компонента.

RCC-36. Вынос делается по ответственности, а не по количеству строк.

Длинный файл сам по себе не является причиной выноса. Причина выноса - новая
мини-задача, отдельный contract, повторяемый item, отдельный side effect или
локальная композиция.

RCC-37. Локальная сложность должна оставаться локальной.

Если сложный helper нужен только компоненту, он может жить рядом с ним. Если
helper стал бизнес-правилом, shared utility или частью domain contract, ему не
место внутри React-компонента.

## Финальная Проверка

RCC-38. Перед завершением проверь читаемость сверху вниз.

Ответь на вопросы:

- понятно ли, какие данные компонент получает?
- понятно ли, какие derived values он строит?
- понятно ли, какие actions пользователь может выполнить?
- можно ли читать JSX как композицию?
- нет ли прямой бизнес-логики внутри JSX?

RCC-39. Перед завершением проверь роли функций.

Каждая функция в файле должна быть одной из:

- pure helper;
- local hook;
- handler;
- component.

Если функция не попадает ни в одну роль, ее назначение нужно уточнить или
изменить структуру.

RCC-40. Перед завершением проверь, что React-specific код не скрывает общую
логику.

Если код можно описать без React-терминов как бизнес-правило, преобразование
данных или policy, он не должен оставаться спрятанным внутри JSX или hook body
без осознанной причины.

## Audit Checklist

Перед завершением правки компонента проверь:

- imports разложены по алгоритму RCC-02;
- package/workspace imports стоят выше React-группы;
- behavior API, hooks и helpers читаются через namespace;
- runtime/framework-specific contracts не переописаны локальными `as`;
- `component.tsx` не стал контейнером для types, constants, helpers, hooks и
  вложенных components;
- named values и handlers объявлены до JSX;
- JSX описывает композицию, а не вычисления;
- field с `label/control/error/mapping` имеет собственную мини-задачу;
- повторяемый JSX не скопирован без имени;
- изменения не расширили scope на соседние компоненты без явной задачи.

## Проверка Документационных Изменений

Для docs-only изменений достаточно:

```bash
git diff --check
./agent/scripts/status-all.sh
```
