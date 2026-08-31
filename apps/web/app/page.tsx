import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import DemoTabs from "@/components/landing/DemoTabs";

export const metadata: Metadata = {
  title: "TishaCare: мониторинг пациентов между приёмами",
  description:
    "Пациент ведёт короткие ежедневные записи о состоянии в Telegram, врач видит динамику между визитами и список тех, кому нужно внимание сейчас.",
};

const BOT_URL = "https://t.me/tishacarebot";

export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* ---------- nav ---------- */}
      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navInner}`}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} />
            TishaCare
          </Link>
          <nav className={styles.navLinks}>
            <a href="#approach">Подход</a>
            <a href="#doctor">Врачу</a>
            <a href="#patient">Пациенту</a>
            <a href="#privacy">Приватность</a>
            <a href="#faq">Вопросы</a>
          </nav>
          <div className={styles.navSpacer} />
          <div className={styles.navActions}>
            <Link href="/login" className={styles.navLogin}>
              Войти
            </Link>
            <Link href="/register" className={`${styles.btnPrimary} ${styles.navCta}`}>
              Подключить клинику
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <span className={styles.heroKicker}>Мониторинг между приёмами</span>
            <h1 className={styles.h1}>
              Врач видит пациента не раз в месяц, а каждый день
            </h1>
            <p className={styles.heroSub}>
              TishaCare просит у пациента 30 секунд в день на короткую запись о
              состоянии в Telegram. Врач получает спокойную картину динамики и
              список тех, кому нужно внимание прямо сейчас.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/register" className={styles.btnPrimary}>
                Подключить клинику
              </Link>
              <a href={BOT_URL} className={styles.btnGhost} target="_blank" rel="noreferrer">
                Открыть Mini App пациента
              </a>
            </div>
            <p className={styles.heroNote}>
              Регистрация клиники или частной практики. Пациенту не нужно ставить
              приложение: всё внутри Telegram.
            </p>
            <div className={styles.heroTrust}>
              <span>Записи под псевдонимами</span>
              <span>Пациент управляет своими данными</span>
              <span>Изолированные контуры: prod / staging / local</span>
            </div>
          </div>

          <div className={styles.mock} aria-hidden="true">
            <div className={styles.mockBar}>
              <span className={styles.mockDots}>
                <i />
                <i />
                <i />
              </span>
              Дашборд врача · Требуют внимания
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.mockShot}
              src="/landing/triage.png"
              alt=""
            />
            <div className={styles.mockBar}>
              <span className={styles.mockDots}>
                <i />
                <i />
                <i />
              </span>
              Карта пациента · Самочувствие
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.mockShot}
              src="/landing/dynamics.png"
              alt=""
            />
          </div>
        </div>
      </section>

      {/* ---------- problem ---------- */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>Слепая зона</span>
          <h2 className={styles.h2}>Между двумя приёмами врач не видит почти ничего</h2>
          <p className={styles.lead}>
            Классический приём при БАР: пациент приходит раз в несколько недель и
            пересказывает по памяти. Ухудшение между визитами замечают поздно,
            когда оно уже развернулось.
          </p>
          <div className={styles.problemGrid}>
            <div className={styles.problemItem}>
              <strong>1 раз</strong>
              <span>в месяц врач обычно видит пациента и его состояние</span>
            </div>
            <div className={styles.problemItem}>
              <strong>по памяти</strong>
              <span>
                клиент вспоминает последние дни, а не те три недели, что прошли
              </span>
            </div>
            <div className={styles.problemItem}>
              <strong>поздно</strong>
              <span>
                просадку настроения или срыв режима замечают уже на приёме
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- approach ---------- */}
      <section id="approach" className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>Подход</span>
          <h2 className={styles.h2}>Непрерывное наблюдение вместо среза раз в месяц</h2>
          <p className={styles.lead}>
            Мы не переписываем сессии в SOAP-заметки. Мы закрываем промежуток
            между приёмами: короткий ежедневный сигнал от пациента и понятная
            картина для врача.
          </p>
          <div className={styles.grid3}>
            <div className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.cardIconMint}`}>🫧</div>
              <h3>Пациенту легко</h3>
              <p>
                Чек-ин из пяти шагов в мессенджере, который уже открыт: настроение,
                состояние, энергия, сон, приём препаратов. 30 секунд, без
                установки приложений.
              </p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>📈</div>
              <h3>Врачу видно</h3>
              <p>
                Динамика на графике, опросники с интерпретацией и триаж-дашборд,
                который сам поднимает наверх тех, у кого что-то идёт не так, и
                говорит почему.
              </p>
            </div>
            <div className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.cardIconSand}`}>🎯</div>
              <h3>Ничего лишнего</h3>
              <p>
                Награда только за сам факт регулярных записей, не за их
                содержание. Пороги опросников честно помечены как эвристические:
                это помощь врачу, не диагноз.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- demo (doctor) ---------- */}
      <section id="doctor" className={styles.section}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>Панель врача</span>
          <h2 className={styles.h2}>Что видит врач к началу приёма</h2>
          <p className={styles.lead}>
            Всё, что пациент отметил между визитами, собрано в одну карту.
          </p>
        </div>
        <div className={styles.wrap}>
          <DemoTabs />
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>Как это работает</span>
          <h2 className={styles.h2}>Три шага от подключения до динамики</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <h3>Клиника заводит аккаунт</h3>
              <p>
                Регистрация клиники или частной практики, роли admin и member,
                приглашение коллег по одноразовой ссылке.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <h3>Пациент подключается по коду</h3>
              <p>
                Пациент запускает бота @tishacarebot, вводит код клиники и
                оказывается связан с врачом. Данные хранятся под псевдонимом.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <h3>Врач видит динамику и триаж</h3>
              <p>
                Ежедневные отметки складываются в график и в список «Требуют
                внимания». Бот сам напоминает пациенту про чек-ин и завтрашний
                приём.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- patient ---------- */}
      <section id="patient" className={styles.section}>
        <div className={`${styles.wrap} ${styles.split}`}>
          <div className={styles.phone} aria-hidden="true">
            <div className={styles.phoneHead}>Чек-ин · шаг 3 из 5</div>
            <div className={styles.phoneBody}>
              <p className={styles.phoneQ}>Как энергия сегодня?</p>
              <div className={styles.phoneOpts}>
                <div className={styles.phoneOpt}>Совсем нет сил</div>
                <div className={styles.phoneOpt}>Ниже обычного</div>
                <div className={`${styles.phoneOpt} ${styles.phoneOptSel}`}>
                  Как обычно
                </div>
                <div className={styles.phoneOpt}>Больше обычного</div>
              </div>
              <div className={styles.phoneProgress}>
                <i />
              </div>
            </div>
          </div>

          <div>
            <span className={styles.kicker}>Пациенту</span>
            <h2 className={styles.h2}>30 секунд в день, а не дневник на страницу</h2>
            <p className={styles.lead}>
              Mini App внутри Telegram: ничего не нужно скачивать, регистрироваться
              заново и держать открытым лишнее приложение.
            </p>
            <ul className={styles.featureList}>
              <li>
                <span className={styles.featureBullet}>✓</span>
                <span>
                  <b>Короткий чек-ин</b>
                  Настроение, состояние, энергия, сон, приём препаратов. Можно
                  прямо с клавиатуры бота.
                </span>
              </li>
              <li>
                <span className={styles.featureBullet}>✓</span>
                <span>
                  <b>Моя динамика</b>
                  Свой график по своим отметкам, с пояснением, как его читать.
                </span>
              </li>
              <li>
                <span className={styles.featureBullet}>✓</span>
                <span>
                  <b>План на трудный момент</b>
                  Личный кризисный план и телефоны помощи всегда под рукой.
                </span>
              </li>
              <li>
                <span className={styles.featureBullet}>✓</span>
                <span>
                  <b>Плотина Тиши</b>
                  Мягкий прогресс за регулярность записей: награждается привычка,
                  не содержание.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- privacy ---------- */}
      <section id="privacy" className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>Приватность и данные</span>
          <h2 className={styles.h2}>Данные пациента защищены на каждом шаге</h2>
          <p className={styles.lead}>
            Речь о самой чувствительной информации, поэтому приватность заложена в
            архитектуру, а не добавлена сверху.
          </p>
          <div className={styles.privacyGrid}>
            <div className={styles.privacyCard}>
              <div className={`${styles.cardIcon} ${styles.cardIconMint}`}>🔑</div>
              <h3>Псевдонимы</h3>
              <p>
                Записи хранятся под псевдонимами и идентификаторами, без личных
                данных пациента.
              </p>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.cardIcon}>🧩</div>
              <h3>Изолированные контуры</h3>
              <p>
                Три уровня изоляции: production, staging, local. Боевые секреты не
                покидают продакшен.
              </p>
            </div>
            <div className={styles.privacyCard}>
              <div className={`${styles.cardIcon} ${styles.cardIconSand}`}>🗂️</div>
              <h3>Контроль у пациента</h3>
              <p>
                Пациент может отключить напоминания и отвязаться от врача. Связь
                строится по явному коду.
              </p>
            </div>
            <div className={styles.privacyCard}>
              <div className={styles.cardIcon}>📤</div>
              <h3>Выгрузка карты</h3>
              <p>
                Врач выгружает карту пациента в CSV или на печать для истории
                болезни, без ручного переноса.
              </p>
            </div>
            <div className={styles.privacyCard}>
              <div className={`${styles.cardIcon} ${styles.cardIconMint}`}>💬</div>
              <h3>Только нужный канал</h3>
              <p>
                Сообщения идут в одну сторону, от врача к пациенту. Никакой ленты
                и лишней переписки.
              </p>
            </div>
            <div className={styles.privacyCard}>
              <div className={`${styles.cardIcon} ${styles.cardIconSand}`}>⚠️</div>
              <h3>Честные оговорки</h3>
              <p>
                Пороги опросников эвристические, MVP-уровня, не валидированы
                специалистом. Результат всегда с дисклеймером.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- quotes (placeholder) ---------- */}
      <section className={styles.section}>
        <div className={`${styles.wrap} ${styles.center}`}>
          <span className={styles.kicker}>Голоса пилота</span>
          <h2 className={styles.h2}>Что говорят на пилоте</h2>
        </div>
        <div className={styles.wrap}>
          <div className={styles.quoteGrid}>
            <div className={styles.quote}>
              <p>
                «Заготовка под отзыв врача: про то, что перестал полагаться на
                пересказ и видит просадку заранее.»
              </p>
              <div className={styles.quoteWho}>
                <b>Имя, специальность</b>
                Клиника, город
              </div>
            </div>
            <div className={styles.quote}>
              <p>
                «Заготовка под отзыв: про то, что триаж экономит время на разборе
                списка пациентов.»
              </p>
              <div className={styles.quoteWho}>
                <b>Имя, специальность</b>
                Клиника, город
              </div>
            </div>
            <div className={styles.quote}>
              <p>
                «Заготовка под отзыв пациента: про то, что чек-ин занимает меньше
                минуты и не раздражает.»
              </p>
              <div className={styles.quoteWho}>
                <b>Имя пациента или инициалы</b>
                Участник пилота
              </div>
            </div>
          </div>
          <p className={styles.placeholderNote}>
            Блок с реальными отзывами появится после первого пилота. Сейчас это
            заготовки, не настоящие цитаты.
          </p>
        </div>
      </section>

      {/* ---------- faq ---------- */}
      <section id="faq" className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.wrap}>
          <span className={styles.kicker}>Вопросы</span>
          <h2 className={styles.h2}>Коротко о главном</h2>
          <div className={styles.faq}>
            <details className={styles.faqItem}>
              <summary>Чем это отличается от инструментов для заметок по сессиям?</summary>
              <p>
                Такие инструменты ускоряют оформление того, что уже произошло на
                приёме. TishaCare работает в промежутке между приёмами: короткие
                ежедневные отметки пациента и динамика для врача.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Что именно отмечает пациент?</summary>
              <p>
                Чек-ин из пяти шагов: настроение, состояние, энергия, сон, приём
                препаратов. Плюс опросники (Бек, PHQ-9, GAD-7, YMRS, MDQ, ASRS,
                AQ-10, MSI-BPD, колесо баланса, когнитивная батарея), дневник
                мыслей и дневник сна.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Нужно ли пациенту ставить приложение?</summary>
              <p>
                Нет. Всё работает в Telegram: чек-ин доступен и в Mini App, и
                полностью с клавиатуры бота. Для входа в веб-версию есть вход по
                email и паролю.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Как защищены данные?</summary>
              <p>
                Записи хранятся под псевдонимами, без личных данных пациента. Три
                изолированных контура (production, staging, local), боевые секреты
                только в продакшене. Пациент управляет напоминаниями и связью с
                врачом.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Можно ли доверять интерпретации опросников?</summary>
              <p>
                Пороги эвристические, MVP-уровня, не валидированы специалистом.
                Это ориентир для врача, а не диагноз. MDQ при этом считается по
                клиническим критериям, а не простой суммой.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Как это встроится в работу клиники?</summary>
              <p>
                Клиника регистрирует аккаунт, приглашает врачей по ссылке, выдаёт
                пациентам код для подключения. Карту пациента можно выгрузить в
                CSV или на печать для истории болезни.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ---------- final cta ---------- */}
      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.finalCta}>
            <h2>Перестаньте узнавать об ухудшении на приёме</h2>
            <p>
              Подключите клинику к пилоту TishaCare: непрерывный сигнал от
              пациента, спокойная динамика и триаж вместо пересказа по памяти.
            </p>
            <div className={styles.finalCtas}>
              <Link href="/register" className={styles.btnPrimary}>
                Подключить клинику
              </Link>
              <a href={BOT_URL} className={styles.btnGhost} target="_blank" rel="noreferrer">
                Посмотреть Mini App
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className={styles.footer}>
        <div className={`${styles.wrap}`}>
          <div className={styles.footerInner}>
            <div className={styles.brand}>
              <span className={styles.brandDot} />
              TishaCare
            </div>
            <nav className={styles.footerLinks}>
              <Link href="/login">Вход для врача</Link>
              <Link href="/register">Регистрация клиники</Link>
              <a href={BOT_URL} target="_blank" rel="noreferrer">
                Бот для пациента
              </a>
            </nav>
            <p>Платформа мониторинга пациентов с БАР</p>
          </div>
          <p className={styles.disclaimer}>
            TishaCare не заменяет очную помощь и не ставит диагноз. Интерпретации
            опросников носят ориентировочный характер и предназначены для
            специалиста. В кризисной ситуации обращайтесь в скорую помощь или на
            линию психологической поддержки.
          </p>
        </div>
      </footer>
    </div>
  );
}
