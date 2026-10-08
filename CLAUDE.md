@AGENTS.md

# Wandering Log（日本語版）プロジェクト構成

Google マップ上に訪問した場所・訪問履歴・コメントを記録するアプリ。

## 技術スタック
- Next.js 16.2.0（App Router）/ React 19.2.4 / TypeScript
- Tailwind CSS v4
- 地図: @vis.gl/react-google-maps（places, geometry ライブラリを使用）
- 認証: next-auth v5 beta（Credentials + JWT セッション、bcryptjs）
- DB: PostgreSQL + Drizzle ORM（pg の接続プール）
- AI: Vercel AI SDK（ai, @ai-sdk/anthropic, @ai-sdk/react）と @anthropic-ai/sdk

## コマンド
- `npm run dev` : 開発サーバー
- `npm run build` : 本番ビルド
- `npm run lint` : ESLint
- テストのスクリプトはない

## ディレクトリ
- `app/page.tsx` : メイン画面（クライアントコンポーネント）。地図・各モーダル・位置の state をここで持つ
- `app/login/`, `app/register/` : ログイン・ユーザー登録画面
- `app/components/` : MapContainer, Header, HeaderMobile, ChatWidget, Modal（Location / Google / Logs / Comments）
- `app/components/temp/` : 一時置き場
- `app/context/AppContext.tsx` : 全体で共有する state（currentUserId など）
- `app/api/*/route.ts` : API ルート。`get_*` `save_*` `delete_*` の機能ごとに 1 ディレクトリ。ほかに `chat`, `description`（AI）, `register`, `auth/[...nextauth]`
- `auth.ts` : NextAuth の設定（handlers, auth, signIn, signOut を export）
- `lib/db.ts` : Drizzle の DB 接続
- `lib/schema.ts` : テーブル定義（users, visited_locations, visited_places, visited_logs, visited_comments）
- `lib/axios.ts` : baseURL が `/api` の axios インスタンス
- `README/` : 公開用 README と画像

## 環境変数
- `DATABASE_URL` : PostgreSQL の接続文字列
- `AUTH_SECRET` : NextAuth の秘密鍵
- `ANTHROPIC_API_KEY` : AI チャット・説明文生成
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` : Google Maps
- `NEXT_PUBLIC_LOCATION_MODE` : 起動時の位置。`live` で現在地を取得、それ以外・未設定は demo（銀座で起動）。`live` でも、取得に失敗したとき、10 秒以内に取得できないとき（許可ダイアログの放置を含む）、位置情報が使えない環境では銀座で起動する。銀座で起動したあとに届いた現在地は無視するので、現在地へ移るには現在地ボタンを使う
- `NEXT_PUBLIC_` の付く変数はビルド時に値が埋め込まれる。値を変えたら再ビルド（Vercel では再デプロイ）が必要

## 注意
- DB のスキーマは `lib/schema.ts`（Drizzle）が正。`prisma/schema.prisma` と `prisma.config.ts` も残っているが、アプリのコードは Drizzle を使っている
- `app/page.tsx` の認証チェックはクライアント側で `/api/auth/session` を呼び、未ログインなら `/login` に移動する
