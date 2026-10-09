# Imam Al-Jazari Telegram Bot — starter production foundation

Multilingual Telegram bot for **مَقْرَأَةُ الإِمَامِ الجَزَرِيِّ لِلإِقْرَاءِ وَالإِجَازَةِ بِالسَّنَد**. Languages: Arabic, Amharic, English.

## Included in this version

- Language selection and saved user language.
- Student registration by full name, permanent student code, and 30-minute welcome bonus.
- Main menu, account summary, schedule information, and program information.
- Recharge package selection: 100/200/300/400/500/600/1000 minutes.
- Payment method choice: Wallet → Telebirr or M-Pesa; Bank → BOA or CBE.
- Copy-friendly payment details displayed in a monospaced block.
- Receipt intake by photo or PDF and a pending payment request sent to the configured admin group.
- `/approve TOP-000001`, `/reject TOP-000001`, `/deduct IF-0001 20`, `/balance IF-0001`, `/broadcast message`, `/language`, `/cancel`.
- PostgreSQL storage, ledger entries, transaction-safe approval/deduction, basic audit logs, health endpoint for hosting.
- Six schedule definitions in `schedules.js`, timezone configurable as `Africa/Addis_Ababa`.

## Important scope note

This is a functional foundation based on the files visible in the supplied screenshot, not yet the entire large specification. Full multi-field registration, group membership/muting, exam scheduler and overdue restrictions, audio delivery/deletion jobs, full resource library management, localized broadcast variants, and comprehensive automated tests still need to be implemented and tested before treating the system as fully production-ready. Do not assume these unfinished modules exist just because they are described in the broader specification.

## Requirements

- Node.js 20 or later
- A Telegram bot token from BotFather
- A PostgreSQL database
- A numeric Telegram user ID for the administrator

## Setup

1. Copy `.env.example` to `.env`.
2. Set `BOT_TOKEN`, `DATABASE_URL`, `ADMIN_IDS`, and optionally `ADMIN_GROUP_ID`.
3. Confirm payment numbers and account name in `.env`.
4. Install and run:

```bash
npm install
npm run check
npm start
```

The bot creates its required tables automatically at startup. Back up PostgreSQL regularly. Keep `.env` private and never commit it.

## Payment method details

- Wallet: Telebirr `0990161371`, M-Pesa `0721009122`
- Bank: BOA `226626646`, CBE `1000285374425`
- Account name: `خالد أحمد مصطفى / Khalid Ahmed Mustafa`

Payment requests are **not** automatically verified against a bank. A trusted admin must inspect the receipt and approve/reject it. Only IDs listed in `ADMIN_IDS` may run admin commands.

## Admin group

Add the bot to your private supervisor group and set `ADMIN_GROUP_ID` to that chat's numeric ID. The bot must be allowed to send messages and documents there. Add the bot to the group and obtain the ID securely; do not publish the group ID or bot token.

## Hosting

For a Render web service, use build command `npm install` and start command `npm start`. Set all environment variables in the hosting dashboard. The `/health` endpoint checks process and database health. A free host may sleep or have resource limits; persistent PostgreSQL is required for reliable records.

## Commands

- `/start` — start or open the bot
- `/language` — choose language
- `/cancel` — cancel the current flow
- `/approve TOP-000001` — approve a pending payment (admin only)
- `/reject TOP-000001` — reject a pending payment (admin only)
- `/deduct IF-0001 20` — record a 20-minute session (admin only)
- `/balance IF-0001` — inspect student balance (admin only)
- `/broadcast your message` — broadcast one message to all registered bot users (admin only)

## Notes

- User identity is based on Telegram numeric user ID, not username.
- Payment approval is duplicate-safe: already reviewed requests cannot credit minutes again.
- Keep backups and test with a private test bot before using real payments.
- The `schedules.js` definitions are data only in this version; automatic group enforcement and exam scheduling are not implemented yet.
