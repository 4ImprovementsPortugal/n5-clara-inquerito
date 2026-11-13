# Nº5 Clara | Página de Inquérito

Landing + inquérito de 11 perguntas para consultores. Quem acaba recebe por email o **voucher de 2 meses da Clara Elite** e o **plano** feito com as respostas. O mesmo fluxo e as mesmas regras do site principal (`N5BRAND/n5-clara-site`, página `/inquerito/`).

## Como funciona o envio

1. O navegador envia o formulário **`inquerito-clara`** para a Netlify (Netlify Forms). O formulário escondido que a Netlify deteta está no topo do `index.html`.
2. A cada inscrição válida corre `netlify/functions/submission-created.mjs`, que:
   - cria/atualiza o contacto no **GHL** (`netlify/ghl.js`): dados, etiquetas (`inquerito-clara`, `voucher-elite-2-meses`, `plano-…`, `pagina-…`) e uma nota com as respostas;
   - gera o código do voucher (`ELITE-XXXXXX`, o mesmo email dá sempre o mesmo código) e **envia o email** pelo GHL com o voucher e o plano (`netlify/voucher.js`).
3. O ecrã de obrigado (`obrigado.html`) mostra o mesmo plano, calculado no navegador.

As perguntas e as regras do plano estão num só ficheiro, **`js/inquerito.js`**, usado pela página e pelo servidor. Se mudar uma pergunta ou o plano, muda nos dois lados. As mensalidades estão em `js/precos.js` (manter iguais às do site principal).

## Publicar (Netlify)

1. Ligar este repositório do GitHub a um site da Netlify e apontar o domínio. O `netlify.toml` já define a pasta das funções, sem passo de build.
2. Em **Site configuration > Environment variables**, criar:
   - `GHL_TOKEN`: token do GHL com permissão para contactos, notas, etiquetas e **`conversations/message.write`** (enviar mensagens);
   - `GHL_LOCATION_ID`: id da localização (sub-conta) do GHL.
   - `GHL_WEBHOOK_INQUERITO`: endereço do webhook de entrada do workflow do GHL (opcional). **Fica só aqui, nunca no código:** leva o id da localização no caminho e a Netlify bloqueia o build se o encontrar num ficheiro.
3. No GHL, o domínio `numerocinco.pt` tem de estar configurado como domínio de envio (o email sai de `pedro.ferreira@numerocinco.pt`).
4. Depois do primeiro deploy, confirmar em **Forms** que o formulário `inquerito-clara` aparece e fazer uma resposta de teste com um email vosso.

Sem estas variáveis o formulário não falha: a função regista "GHL por configurar" no log e não envia nada.

## Correr localmente

Os módulos JS exigem um servidor (não abre por duplo clique):

```bash
python -m http.server 8080
```

O envio e o email só funcionam depois de publicado na Netlify (ou com `netlify dev`).

## Notas

- Só o primeiro nome e as respostas ficam no navegador (30 dias), para o ecrã de obrigado. Email e telemóvel não.
- O texto legal (`privacidade.html`, `termos.html`, `cookies.js`) vem do repositório da pré-reserva e do site principal; o email do voucher faz referência a `clara.numerocinco.pt/termos`.
