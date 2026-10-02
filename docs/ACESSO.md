# Acesso e identidade visual

O ambiente local usa as credenciais de desenvolvimento; a VPS usa APP_USER e APP_PASSWORD do arquivo privado /opt/kart-vicio/.env.production. As senhas não são versionadas. A senha local não é aceita automaticamente em produção.

O formulário permite mostrar e ocultar a senha. Após autenticar, uma navegação completa atualiza a sessão e respeita o prefixo /kart. Falhas de conexão têm limite de 15 segundos e mensagem na tela.

A logo fornecida pelo proprietário é usada no login e na navegação. Os favicons e ícones PWA são derivados dela. O registro PWA é silencioso, mantendo a escala de 70% sem rodapé técnico.

Validação não destrutiva: node scripts/login-branding.mjs. Para produção, informar QA_URL, QA_BASE_PATH, QA_USER e QA_PASSWORD pelo ambiente, sem registrar segredos nos logs. O teste verifica senha incorreta, login pelo formulário, sessão após recarregar, logout, novo login, logo, favicon e larguras de 320 a 1440 pixels. Não modifica dados de corrida.
