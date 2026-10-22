# Study Coffee

Sala de estudos online com pomodoro sincronizado, chuva na janela e frases para Fuvest, Unicamp e Unesp. Três acessos grátis por conta; depois, acesso vitalício por R$ 10 via Pix.

## Como funciona

| Parte | Onde roda | O que faz |
|---|---|---|
| `index.html` + `config.js` | GitHub Pages | O site. Conversa com o Supabase pelo navegador. |
| `supabase/migrations/*.sql` | Supabase (Postgres) | Tabelas `profiles`, `payments`, `redeemed_codes`, `entries`; regras de acesso (RLS); função `enter_room` que conta os acessos grátis no servidor. |
| `supabase/functions/*` | Supabase Edge Functions (Deno) | `create-pix` e `check-pix` (cobrança Pix no Mercado Pago), `mp-webhook` (aviso do Mercado Pago), `redeem-code` (códigos vitalícios assinados), `admin-grant` (liberação manual pelo admin). |
| Mesa ao vivo | Supabase Realtime (Presence) | Cada aluno publica seu timer no canal `room:<código da mesa>`; os colegas aparecem na mesa. |

Fluxo do pagamento: o aluno abre a tela do Pix → `create-pix` cria a cobrança no Mercado Pago e devolve o QR → o aluno paga → o Mercado Pago chama `mp-webhook` (e o site consulta `check-pix` a cada 6 s) → o servidor marca `lifetime = true` → a tela do aluno libera sozinha via Realtime.

Sem o `MP_ACCESS_TOKEN` configurado, o site cai no **Pix manual**: a chave estática do Arthur com um identificador único por aluno (campo txid do BR Code, aparece no comprovante). O Arthur confere no extrato e libera pelo painel Admin do próprio site, ou o aluno ativa um código vitalício.

## Configuração (uma vez)

### 1. Supabase
Projeto: `mcpffjkyngnwscdxqrrf` (Study Coffee). Migrações e funções já aplicadas pelo conector em 22/10/2026; `config.js` já tem a URL e a chave pública.
1. Para reaplicar do zero: migrações em `supabase/migrations/` (SQL Editor, `supabase db push` ou conector) e as cinco funções de `supabase/functions/` (`mp-webhook` com **Verify JWT desligado**, como em `supabase/config.toml`).
2. Authentication → Sign In / Providers → Email: desligue **Confirm email** (cadastro instantâneo). Se preferir manter, configure um SMTP próprio: o SMTP padrão manda poucos e-mails por hora.
3. Authentication → URL Configuration: **Site URL** = endereço do site no GitHub Pages (ex.: `https://SEU-USUARIO.github.io/study-coffee/`) e adicione o mesmo endereço em **Redirect URLs**.
4. Depois de criar a sua conta no site, torne-se admin no SQL Editor:
   ```sql
   update public.profiles set is_admin = true where email = 'seu@email.com';
   ```

### 2. Mercado Pago (Pix automático)
1. Crie a conta e, em mercadopago.com.br/developers → Suas integrações → Criar aplicação (pagamentos online, sem plataforma), pegue o **Access Token de produção**.
2. Grave o segredo nas funções: Edge Functions → Secrets → `MP_ACCESS_TOKEN` (ou `supabase secrets set MP_ACCESS_TOKEN=...`, ou o workflow abaixo).
3. Opcional: em Webhooks da aplicação, cadastre `https://SEU-REF.supabase.co/functions/v1/mp-webhook` (evento Pagamentos) e grave a assinatura secreta em `MP_WEBHOOK_SECRET`. Mesmo sem cadastrar, cada cobrança já leva a `notification_url`.
4. Para testar com valor menor, grave `PIX_AMOUNT=1` (padrão 10). Apague depois.

### 3. GitHub Pages
Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`. O site fica em `https://SEU-USUARIO.github.io/study-coffee/`.

### 4. Workflow opcional (deploy do Supabase a cada push)
Settings → Secrets and variables → Actions: `SUPABASE_ACCESS_TOKEN` (token pessoal em supabase.com/dashboard/account/tokens), `SUPABASE_PROJECT_ID` (ref do projeto), `SUPABASE_DB_PASSWORD`, e, se tiver, `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET`. Sem esses segredos o workflow não faz nada.

## Códigos vitalícios
Continuam valendo: são assinados pela chave privada do painel do Arthur e conferidos pela chave pública em `supabase/functions/_shared/codes.ts`. Agora cada nº só pode ser usado **uma vez** (tabela `redeemed_codes`) e, se o código tiver e-mail, só na conta desse e-mail.

## Testes
- Funções (Deno, com Supabase e Mercado Pago simulados): `deno test --allow-env --allow-read --allow-net=registry.npmjs.org supabase/functions/_tests/`
- A migração foi validada num Postgres real (PGlite) com RLS, triggers e `enter_room`.

## Arquivos
```
index.html            o site
config.js             URL e chave pública do Supabase, WhatsApp, Pix manual
supabase/config.toml  verify_jwt por função
supabase/migrations/  banco
supabase/functions/   Edge Functions (+ _shared e _tests)
.github/workflows/    deploy opcional do Supabase
```
