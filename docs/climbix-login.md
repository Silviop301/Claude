# Climbix: entrar com Google, GitHub e Discord

O jogo já tem os botões "Continuar com Google / GitHub / Discord". Cada serviço só aparece depois que
as chaves dele estiverem no servidor. Dá para ligar só um, dois ou os três.

## Como funciona para o jogador

- **Entrar ou criar conta:** em **Conta**, toca em "Continuar com Google" (ou GitHub ou Discord).
  - Se esse Google já está ligado a uma conta do Climbix, entra direto nela.
  - Se é a primeira vez, o jogo pergunta se ele quer **criar uma conta nova** (escolhe o usuário, sem senha)
    ou **ligar a uma conta que já existe** (digita o usuário e a senha dessa conta uma vez).
- **Ligar a conta atual:** com a conta aberta, em **Conta → Formas de entrar**, toca em **Conectar** no serviço.
  Pode ligar os três na mesma conta (um de cada).
- **Esqueci a senha:** entra pelo serviço ligado e, em **Conta → Senha → trocar**, cria uma senha nova
  sem precisar da antiga. Os outros aparelhos saem da conta e precisam entrar de novo.
- **Desconectar:** em **Formas de entrar**. A última forma de entrar não sai enquanto a conta não tiver senha,
  para a conta não ficar trancada.

## Configurar (uma vez)

O endereço de retorno é o mesmo nos três serviços:

```
https://climbix.app/api/oauth.php
```

### Google

1. Em <https://console.cloud.google.com/>, crie um projeto (ex.: "Climbix").
2. **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform"): tipo **Externo**,
   nome do app "Climbix", e-mail de suporte e domínio autorizado `climbix.app`.
   Os escopos usados são só `openid`, `email` e `profile`.
3. Em **Público-alvo**, toque em **Publicar app** (status "Em produção"). Em "Teste", só os e-mails
   cadastrados como testadores conseguem entrar. Com esses escopos não precisa de verificação do Google.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
   Em **URIs de redirecionamento autorizados**, coloque `https://climbix.app/api/oauth.php`.
5. Copie o **ID do cliente** e a **chave secreta do cliente**.

### GitHub

1. Em <https://github.com/settings/developers>, clique em **OAuth Apps → New OAuth App**.
2. Homepage URL: `https://climbix.app`. Authorization callback URL: `https://climbix.app/api/oauth.php`.
3. Depois de criar, copie o **Client ID** e clique em **Generate a new client secret**.

### Discord

1. Em <https://discord.com/developers/applications>, clique em **New Application** ("Climbix").
2. Em **OAuth2 → Redirects**, adicione `https://climbix.app/api/oauth.php` e salve.
3. Copie o **Client ID** e o **Client Secret** (botão **Reset Secret** se ele não aparecer).

### Colocar as chaves no servidor

No repositório do GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
Crie os pares dos serviços que você configurou:

| Serviço | Segredos                                          |
|---------|---------------------------------------------------|
| Google  | `CLIMBIX_GOOGLE_ID` e `CLIMBIX_GOOGLE_SECRET`     |
| GitHub  | `CLIMBIX_GITHUB_ID` e `CLIMBIX_GITHUB_SECRET`     |
| Discord | `CLIMBIX_DISCORD_ID` e `CLIMBIX_DISCORD_SECRET`   |

Depois rode o deploy: **Actions → Publicar no climbix.app → Run workflow**. Ele grava
`domains/climbix.app/climbix-data/oauth.json` no servidor (fora do `public_html`, onde ninguém baixa pelo site)
e o log mostra "Login ligado para: google, ...". Os botões aparecem no jogo na hora.

Sem usar os segredos do GitHub, dá para criar esse arquivo à mão pelo Gerenciador de Arquivos da Hostinger:

```json
{"google": {"id": "...", "secret": "..."}, "github": {"id": "...", "secret": "..."}, "discord": {"id": "...", "secret": "..."}}
```

Se houver segredos no GitHub, cada deploy reescreve o arquivo com eles.

## Segurança (resumo)

- As chaves secretas ficam só no servidor. O jogo recebe apenas a lista de serviços ligados.
- O retorno do serviço só volta para `climbix.app` ou `www.climbix.app`.
- O código de volta vale uma vez, por 15 minutos, e só junto com um segredo ("verifier") que fica no aparelho
  que começou o login. Um link de retorno aberto em outro aparelho não entra em conta nenhuma.
- O banco guarda do serviço só o id da pessoa e o nome que aparece em "Formas de entrar"
  (e-mail no Google, @usuário no GitHub, nome no Discord).
