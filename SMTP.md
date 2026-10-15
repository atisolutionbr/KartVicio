# Convites de acesso

O envio está implementado, mas permanece desativado até configurar um servidor SMTP.
Os usuários Google já cadastrados não precisam de convite para fazer login.

No .env local e no .env da VPS, fora do Git, definir:

```
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=KartVicio <remetente@seudominio.com.br>
```

Use 465 para TLS direto ou 587 para STARTTLS obrigatório. A validação de certificado
permanece ativa. O remetente deve estar autorizado pelo provedor SMTP.

Na VPS, aplicar com `docker compose -f compose.production.yaml up -d app`.
No ambiente local, reiniciar o servidor Node.

Apenas administradores podem enviar convites para e-mails já cadastrados e ativos.
O convite contém instruções e o link de login; não cria senha ou modifica permissões.
Há intervalo mínimo de cinco minutos por destinatário e registro de status em
kartvicio.invitations. Nenhum envio em massa é feito automaticamente.

Teste sem e-mail real: `node server/invitations-test.mjs`.
O teste usa transporte simulado e verifica permissões, cadastro inativo,
normalização do destinatário, intervalo e falha do provedor. A entrega real depende
das credenciais e da validação com um destinatário autorizado.
