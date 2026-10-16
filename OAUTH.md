# Ativação dos provedores

Os e-mails dos usuários são cadastros, não credenciais OAuth. É necessário registrar um aplicativo Web próprio no Google Cloud e no Microsoft Entra. O aplicativo Google já está configurado; a Microsoft aguarda um diretório Entra acessível e uma credencial própria.

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

O callback valida assinatura, emissor, destinatário, validade, nonce, state e PKCE. Identidades são persistidas por provedor e subject. No login Google, a identidade vem exclusivamente do e-mail verificado do token. Novos Gmail recebem cadastro visualizador sem campeonatos; cadastros inativos continuam bloqueados. As permissões, campeonatos e status continuam vindo de Usuario; registros originais não são sobrescritos.

A Microsoft não garante que a claim email seja prova de titularidade. Portanto o código atual aceita apenas identidades Microsoft previamente vinculadas por provider/subject; não usa a sessão anterior para vincular contas. Antes da ativação, preparar um vínculo inicial assistido pelo administrador, sem conceder permissões por correspondência de email mutável.

Em 16/10/2026, o proprietário optou por adiar a ativação Microsoft até disponibilizar uma conta Microsoft 365/Entra @atisolution.com.br. O Hotmail autenticou no portal, mas o diretório Microsoft Services negou tokens com AADSTS16000. Não foi criado aplicativo nem segredo Microsoft. Para ativação futura:

1. Disponibilizar diretório Entra com permissão para registrar aplicativos.
2. Registrar KartVicio Web com suporte a contas pessoais Microsoft. A conta empresarial será responsável pelo registro; o endpoint consumers continua destinado a Hotmail/Outlook.
3. URLs Web exatas: https://kartvicio.atisolution.com.br/api/auth/microsoft/callback e http://localhost:6300/api/auth/microsoft/callback.
4. Solicitar somente openid/email/profile, sem acesso a mensagens ou contatos.
5. Armazenar Client ID/Secret em .env local e VPS, fora do Git; reiniciar o app.
6. Validar assinatura/state/nonce/PKCE e vínculo por subject; testar visualizador sem campeonatos, vínculo autorizado pelo administrador, inativo bloqueado e ausência de promoção a admin.


Referências: https://developers.google.com/identity/openid-connect/openid-connect e https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
