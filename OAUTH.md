# Ativação dos provedores

Os e-mails dos usuários são cadastros, não credenciais OAuth. É necessário registrar um aplicativo Web próprio no Google Cloud e no Microsoft Entra. Nenhum aplicativo externo foi criado automaticamente.

No arquivo `.env` local, definir:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

Google: cadastrar exatamente `http://localhost:6300/api/auth/google/callback` como URI de redirecionamento. Solicitar apenas openid/email/profile. Enquanto o aplicativo estiver em teste, incluir os usuários de teste na configuração do Google.

Microsoft: permitir contas pessoais Microsoft (Hotmail/Outlook) e cadastrar `http://localhost:6300/api/auth/microsoft/callback` como redirecionamento Web. A implementação usa a autoridade consumers, sem acesso a correio ou contatos.

Reiniciar o servidor após preencher as variáveis. Os botões ficam desabilitados enquanto faltarem credenciais.

O callback valida assinatura, emissor, destinatário, validade, nonce, state e PKCE. Identidades são persistidas por provedor e subject. No primeiro login Google, apenas um e-mail verificado Gmail ou Workspace pode ser associado a um cadastro existente. As permissões, campeonatos e status continuam vindo de Usuario; registros originais não são sobrescritos.

A Microsoft não garante que a claim email seja uma prova de titularidade. Por isso, o primeiro vínculo Microsoft deve ser feito com uma sessão local já autenticada, abrindo `/api/auth/microsoft/start`. Depois disso, usa-se o identificador estável do provedor. Não se concede acesso apenas porque uma claim mutável corresponde ao e-mail de outro usuário. Usuários antigos sem senha local precisam de um processo de primeiro vínculo assistido antes de usar Microsoft.

Referências: https://developers.google.com/identity/openid-connect/openid-connect e https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
