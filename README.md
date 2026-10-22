# Study Coffee

Sala de estudos online com pomodoro sincronizado, chuva na janela e frases para Fuvest, Unicamp, Unesp, banca Vunesp, particulares de Goiás, FGV/Insper e ENEM. Três acessos grátis por conta (ou por aparelho, para quem entra sem conta); depois, acesso vitalício por R$ 10 via Pix.

## Como funciona

| Parte | Onde roda | O que faz |
|---|---|---|
| `index.html` + `config.js` + `js/` | GitHub Pages | O site. `js/app.js` é a lógica, `js/cafe3d.js` o café 3D (Three.js) e `js/voice.js` o microfone (WebRTC). Conversa com o Supabase pelo navegador. |
| `supabase/migrations/*.sql` | Supabase (Postgres) | Tabelas `profiles`, `payments`, `redeemed_codes`, `entries`, `focus_log` (tempo de foco), `tasks` (checklist); regras de acesso (RLS); funções `enter_room` (conta os acessos grátis), `log_focus` (registra foco com limites anti-trapaça) e `room_ranking` (ranking da mesa por dia, semana ou mês). |
| `supabase/functions/*` | Supabase Edge Functions (Deno) | `create-pix` e `check-pix` (cobrança Pix no Mercado Pago), `mp-webhook` (aviso do Mercado Pago), `redeem-code` (códigos vitalícios assinados), `admin-grant` (liberação manual pelo admin). |
| Mesa ao vivo | Supabase Realtime (Presence + Broadcast) | Cada aluno publica timer, foco de agora, personagem e estado do microfone no canal `room:<código da mesa>`; os colegas aparecem na mesa (lista ou café 3D). O mesmo canal transporta a sinalização de voz (WebRTC ponto a ponto, áudio não passa pelo servidor). Visitantes sem conta também entram (acessos grátis contados no aparelho). |

### Recursos da mesa
- **Ranking da mesa**: tempo de foco (timer rodando na fase Foco) por dia, semana (segunda a domingo) e mês, fuso de São Paulo. O site envia fatias de até 15 min pela função `log_focus`, que recusa mais tempo do que passou e limita 16 h/dia. Visitantes não entram no ranking.
- **Minha lista**: checklist pessoal com data; a estrela marca o foco de agora, que aparece em cima do timer e vira o "estudando" que os colegas veem. Contas salvam na tabela `tasks`; visitantes só no aparelho.
- **Microfone**: botão na barra da mesa. Quem liga manda áudio para os presentes por WebRTC (STUN do Google, sem servidor de mídia); cada um pode silenciar um colega só para si. Precisa de HTTPS (GitHub Pages já é).
- **Café 3D**: "Café por cima" e "Minha visão" mostram os personagens de cada um nas mesas do café (janela com chuva, estante, balcão ou plantas, conforme a escolha do aluno). Sem WebGL o site fica na lista.
- **Personagem**: montado no cadastro, na entrada sem conta ou em Conta → Meu personagem; fica em `profiles.avatar` (contas) ou no aparelho (visitantes).

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
- As migrações foram validadas num Postgres real (PGlite) com RLS, triggers, `enter_room`, `log_focus` e `room_ranking`.
- O site foi testado em jsdom com um Supabase simulado (contas, Pix, códigos, visitante, lista, ranking, microfone) e em Chromium real (WebRTC entre duas abas, café 3D).

## Arquivos
```
index.html            o site (marcação e estilos)
js/app.js             lógica do site
js/cafe3d.js          café 3D e montador de personagem (Three.js r128)
js/voice.js           microfone da mesa (WebRTC)
config.js             URL e chave pública do Supabase, WhatsApp, Pix manual
supabase/config.toml  verify_jwt por função
supabase/migrations/  banco
supabase/functions/   Edge Functions (+ _shared e _tests)
.github/workflows/    deploy opcional do Supabase
```
