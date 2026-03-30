[English version](./README.en.md)

## Companion DV Control Center Module (DVCC-only)

Этот модуль оставляет только интеграцию с приложением DV Control Center.
Весь legacy DVIP-функционал (actions/feedback/presets) удален.

## Что доступно

- Action: `dvcc_merge_run_named`
- Feedback: `dvcc_merge_active`, `dvcc_merge_active_flex`, `dvcc_merge_active_pip`
- Variables:
  - `dvcc_merge_active_flex`
  - `dvcc_merge_running_flex`
  - `dvcc_merge_active_pip`
  - `dvcc_merge_running_pip`

## API

- `GET /api/merge/state?mode=flex`
- `GET /api/merge/state?mode=pip`
- `GET|POST /api/merge/run/<preset>?mode=flex|pip`

Модуль не передает `duration/fps/easing`: они берутся из сохраненных настроек DVCC.

## По умолчанию

- DVCC base URL: `http://127.0.0.1:9999`

## Установка

1. Скопировать модуль в папку custom modules Companion.
2. Перезапустить Companion.
3. Удалить и заново добавить инстанс модуля (чтобы обновилась схема actions/feedback).