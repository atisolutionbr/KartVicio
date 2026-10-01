# PWA e responsividade

Escala inicial: 70%, aplicada pelo CSS da aplicação. O rodapé permite alternar para 100%; a preferência fica no dispositivo. O zoom do navegador continua disponível. No celular, campos e botões recebem compensação de tamanho. Tabelas largas mantêm rolagem dentro do próprio painel.

O manifesto usa nome KartVicio, ícones PNG 192/512, idioma pt-BR, modo standalone e atalhos para Box e Command Center. Todos os caminhos respeitam o prefixo compilado `/kart`. HTTPS em produção é necessário para o service worker e a instalação.

Chrome/Edge: use “Instalar KartVicio” quando disponível ou o menu do navegador. Safari no iPhone/iPad: Compartilhar → Adicionar à Tela de Início.

O service worker guarda apenas a tela pública de indisponibilidade. Não armazena respostas da API, credenciais, comandos nem páginas de corrida. Sem rede, uma nova navegação mostra o aviso; uma página já aberta depende da atualização do estado de conexão. Não existe fila de comandos offline. Isso evita executar uma parada antiga quando a conexão volta.

Ícones são reproduzíveis com `node scripts/pwa-icons.mjs`. Após alterar o worker, atualize seu identificador de cache e verifique atualização em uma instalação existente.
