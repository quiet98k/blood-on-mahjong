# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## MongoDB setup

This project includes a simple MongoDB utility at `server/utils/mongo.ts`.

1) Copy env example and set your values:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `MONGODB_URI` (e.g., `mongodb://localhost:27017`)
- `MONGODB_DB` (default database name, e.g., `blood_mahjong`)

2) Start the dev server and test the connection:

```bash
npm run dev
```

Open http://localhost:3000/api/ping — you should see `{ ok: 1, mongo: { ok: 1 } }` if the connection is working.

Use the util in server routes:

```ts
// server/api/users.get.ts
import { getCollection } from '../utils/mongo'

export default defineEventHandler(async () => {
	const users = await (await getCollection('users')).find({}).toArray()
	return users
})
```
