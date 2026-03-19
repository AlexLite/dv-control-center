# DataVideo Control Center

Web-приложение и Companion-модуль для управления видеомикшерами DataVideo по DVIP (основной фокус: SE-3200 / HS-3200).

Проект состоит из двух частей:

- **DV Control Center (Web + API)**: графический редактор PiP/Flex, управление состоянием пульта, Merge Engine, системные панели.
- **Companion module (`dv-control-center`)**: модуль для Bitfocus Companion с action/feedback/variables, включая интеграцию Merge Key.

---

## Что реализовано

### DV Control Center

- Подключение к пульту DataVideo (command/realtime порты DVIP)
- UI-панели:
  - Configuration
  - MultiView
  - P-IN-P
  - Flex
  - Keyer
  - Chroma
  - Inputs / Outputs / Audio / Files / Setup
- Merge Engine (сохранение/запуск key-состояний)
- REST API для внешнего управления
- Хранение состояния и пресетов в `data/`

### Companion module `dv-control-center`

- Базовые DVIP action/feedback/variables (наследие от `datavideo-dvip`)
- Интеграция с DV Control Center Merge API:
  - action: `dvcc_merge_run_named`
  - feedback: `dvcc_merge_active`
  - variables:
    - `dvcc_merge_active_flex`
    - `dvcc_merge_running_flex`
    - `dvcc_merge_active_pip`
    - `dvcc_merge_running_pip`

---

## Структура репозитория

```text
DataVideo Control Center/
├─ datavideo-control-center/                # исходники DV Control Center
│  ├─ release/                              # готовый runtime-пакет приложения
│  ├─ public/                               # frontend
│  ├─ lib/                                  # backend/lib
│  └─ ...
├─ companion-module-dv-control-center/      # рабочий кастомный модуль Companion
├─ companion-module-datavideo-dvip-master/  # базовый upstream-модуль (справочный)
├─ release/                                 # релизная папка для выкладки
├─ doc/                                     # документация
└─ dump/                                    # дампы/карты регистров
```

---

## Требования

- **Windows 10/11**
- **Node.js 18+**
- **Bitfocus Companion 4.x** (для модуля)
- Сетевой доступ к пульту DataVideo

---

## Быстрый старт (DV Control Center)

### Вариант 1: запуск из release

1. Откройте папку:
   - `release/`
2. Установите зависимости:
   - `npm install`
3. Запустите сервер:
   - `node server.js`
4. Откройте в браузере:
   - `http://127.0.0.1:9999`

### Вариант 2: через лаунчер

- Запустите `DV Control Center.exe` из `release/`.

---

## Установка модуля в Companion

1. Скопируйте папку модуля в:
   - `C:\Users\<user>\AppData\Roaming\companion\modules\`
2. Для этого проекта используйте:
   - `companion-module-dv-control-center`
3. Перезапустите Companion.
4. В UI Companion:
   - `Connections` -> `Add connection` -> `DataVideo: DV Control Center`

### Важно

- Путь должен быть именно папкой модуля (не zip, не двойная вложенность).
- После обновления `index.js` модуля нужен перезапуск Companion.

---

## Конфигурация подключения

В модуле Companion:

- `host`: IP пульта
- `port`: realtime/auto (по модели)
- `dvcc_base_url`: URL DV Control Center API (обычно `http://127.0.0.1:9999`)

В DV Control Center:

- IP пульта и порты задаются в Configuration
- Состояния сохраняются в `release/data/*.json`

---

## Частые проблемы

### 1) Модуль не появляется в Companion

Проверьте:

- правильный путь `AppData\Roaming\companion\modules`
- корректный `manifest.json` внутри модуля
- перезапуск Companion

### 2) Merge feedback не подсвечивает кнопку после рестарта

Это возможно, если текущее состояние не совпадает с сохраненным preset 1:1.
Рекомендуется:

- выполнить `Run` нужного key один раз после старта
- либо использовать persisted active key в DVCC API (доработка)

### 3) Нет соединения с пультом

Проверьте:

- IP/порты пульта
- доступность устройства по сети
- что пульт не занят другим контроллером/сессией

---

## Релизный процесс (рекомендуемый)

1. Источник правок:
   - `datavideo-control-center/` и `companion-module-dv-control-center/`
2. Синхронизация runtime в `release/`
3. Очистка временных файлов (`tmp-*`, `*.log`, `*.bak*`)
4. Проверка запуска `server.js` и видимости модуля в Companion

---

## Лицензии и источники

- Базовый модуль Datavideo DVIP основан на экосистеме Bitfocus Companion.
- В репозитории есть кастомные доработки для DV Control Center и Merge API.

---

## Текущее назначение папок

- `companion-module-dv-control-center` — **основная рабочая ветка модуля**
- `companion-module-datavideo-dvip-master` — базовый/справочный upstream

Если нужно убрать путаницу, можно оставить только рабочую ветку и перенести upstream в архив.
