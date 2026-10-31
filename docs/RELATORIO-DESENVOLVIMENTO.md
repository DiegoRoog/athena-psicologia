# ATHENA PSICOLOGIA — relatório de desenvolvimento

Atualização: 30/10/2026. Implementação local baseada no arquivo `Prompt_Unificado_ATHENA_Codex.txt` e nos três recursos visuais fornecidos. A exportação estática final passou em oito cenários Playwright, sem falhas, casos ignorados ou erros JavaScript de execução detectados. Lint, tipos e build passaram.

## Organização e escopo

Diretório exclusivo confirmado para o projeto:

```text
C:\Users\Diego\OneDrive\Desktop\Landing Page\M. Psicologia\Código Psi
```

Todo o desenvolvimento da landing page foi concentrado na subpasta `athena-landing-page`, conforme solicitado. Assets preparados, código, dependências locais, testes e documentação ficam nessa pasta. A configuração prévia das skills foi preservada na raiz. Não houve alteração do Facirap V2, instalação global de skills, criação de backend ou publicação externa.

A experiência implementa a abertura editorial, o título em HTML, a sequência reversível, a abertura das mãos com mensagens e busto dourado, a troca de narrativas, a composição final com a escultura à direita e os dois CTAs demonstrativos.

Na retomada, foram preservados a estrutura Next.js, os assets preparados, o renderer Canvas e os componentes existentes. Foram concluídos o acabamento responsivo, a composição legível do título no celular, o contraste dos textos, o alinhamento do busto, a navegação por hash com foco, o bloqueio de foco em elementos ocultos, a orientação sem JavaScript e a prévia da exportação. Não houve reinstalação de dependências ou skills. Node.js v24.21.0, npm 11.19.0 e npx 11.19.0 estavam disponíveis, e `npm ls --depth=0` confirmou as dependências locais.

## Tecnologias e estrutura

| Recurso | Uso |
| --- | --- |
| Next.js 16.4.3, App Router | Estrutura da página e exportação estática em `out/` |
| React 19.3.1 e TypeScript | Componentes, referências ao DOM e tipos |
| CSS organizado em camadas | Reset, base visual, experiência e responsividade |
| Canvas 2D e `requestAnimationFrame` | Desenho da sequência e sincronização com scroll |
| APIs nativas do navegador | `ResizeObserver`, media queries, `AbortController`, `ImageBitmap`, diálogo e foco |
| Fontsource | Fontes servidas localmente, sem solicitação ao Google Fonts pelo visitante |
| ESLint e TypeScript | Verificação estática |
| Playwright com Chrome | Testes de interação e capturas de tela |

`app/layout.tsx` define idioma `pt-BR`, fontes e metadados. `app/globals.css` reúne a apresentação. `AthenaExperience.tsx` mantém o conteúdo semântico, a navegação e as interações. `FrameSequence.tsx` isola Canvas, carregamento e descarte. `lib/sequence.ts` contém funções de progresso, índice e enquadramento; `lib/narrative.ts` define os capítulos. A documentação de assets e suas medições estão em `assets/`.

Não foram adicionados GSAP, ScrollTrigger ou Lenis. A necessidade central é uma correspondência exata entre a posição nativa da página e o quadro, inclusive no retorno e nas âncoras. As APIs nativas atendem a esse comportamento com menos dependências e sem criar um segundo controlador de rolagem. As orientações de narrativa cinematográfica foram aplicadas à composição e às janelas de progressão.

## Assets inspecionados e preparados

O ZIP contém **240 frames JPEG, de 1280 × 720 pixels**. Os arquivos foram ordenados pelo índice numérico original e renomeados de `frame-0001` a `frame-0240`.

| Conjunto | Destino | Quantidade | Dimensões | Peso total |
| --- | --- | --- | --- | --- |
| Frames originais | `assets/source-frames/` | 240 | 1280 × 720 | 7.187.424 bytes |
| Sequência desktop JPEG | `public/frames/desktop/` | 240 | 1280 × 720 | 7.187.424 bytes |
| Sequência mobile WebP | `public/frames/mobile/` | 240 | 768 × 432 | 4.790.414 bytes |

Os JPEG desktop preservam os bytes originais. Uma conversão de teste para WebP de qualidade 82 chegou a 12.552.792 bytes; por ser maior, foi descartada. A variante mobile usa redução proporcional e WebP de qualidade 60. Os totais acima representam as pastas completas, não o download inicial: o player busca apenas uma janela de frames por vez.

A primeira imagem anexada, de 1672 × 940, foi preservada em `docs/reference/hero-reference.png` e usada como referência visual. Ela não é aplicada como fundo com o título embutido: o primeiro frame da sequência não possui letras e permite reconstruir o nome em HTML sem duplicação.

A segunda imagem é o busto dourado original, RGBA, de 1254 × 1254, preservado em `public/images/golden-bust.png`. A página usa a variante proporcional `golden-bust.webp`, de 640 × 640, com transparência. A imagem aparece em uma janela ligada às palmas abertas, sem geração de conteúdo visual substituto. O primeiro JPEG também funciona como poster persistente.

O script `assets/prepare-assets.py` documenta a preparação; `assets/sequence-metadata.json` registra os valores medidos. A folha de contato usada na análise está em `docs/qa/sequence-contact-sheet.jpg`.

## Marcos reais e narrativa

Os números abaixo usam a numeração dos arquivos, iniciada em 1. O índice interno do player começa em 0.

| Frames observados | Acontecimento | Decisão narrativa |
| --- | --- | --- |
| 1–12 | Escultura centralizada, mãos juntas | Abertura monumental e apresentação da marca |
| 24–48 | Início da abertura; câmera aproxima | Recuo do título e transição para a escuta |
| 48–96 | Palmas abertas, máximo em 72–84 | Textos de acolhimento e imagem dourada sobre o peito |
| 108–144 | Mãos retornam e se unem | Busto retirado; reflexão e autoconhecimento |
| 156–192 | Recuo da câmera e deslocamento à direita | Conteúdo editorial no lado esquerdo |
| 192–240 | Escultura à direita | Convite final e dois botões |

Os capítulos são “O primeiro olhar”, “O espaço da escuta”, “O encontro consigo”, “Um novo sentido” e “O seu próximo passo”. Cada janela de texto deriva do mesmo progresso absoluto da sequência.

## Implementação da animação

O progresso é calculado por:

```text
p = clamp(scrollY / (document.documentElement.scrollHeight - innerHeight), 0, 1)
índice = p >= 1 ? 239 : min(238, round(p × 239))
```

Essa reserva do último índice impede que o frame 240 apareça antes do fim efetivo da página. O sistema não usa relógio, autoplay ou velocidade do mouse para avançar. A mesma posição solicita o mesmo quadro; a disponibilidade de rede pode exigir temporariamente o quadro já decodificado mais próximo.

Um `requestAnimationFrame` agrupa as atualizações; ele só é solicitado quando há scroll, mudança de tamanho, imagem disponível ou outro evento relevante. Referências e variáveis locais evitam renderizações React por frame. O `ResizeObserver` e a atualização após o carregamento das fontes recalculam a progressão quando a altura muda, inclusive após a ativação do layout cinematográfico.

O carregamento prioriza o índice exato e depois seus vizinhos na direção da rolagem. O máximo simultâneo é quatro requisições no desktop e três no mobile. Ao saltar para outra região, o novo alvo pode substituir uma requisição especulativa; trabalho distante é cancelado.

O cache decodificado fica limitado a 24 frames desktop ou 18 mobile. `ImageBitmap.close()` libera os bitmaps descartados; a alternativa com `Image` libera suas URLs de objeto. Como referência de escala, os 240 frames desktop decodificados permanentemente consumiriam aproximadamente 844 MiB apenas em pixels. O cache de 24 limita essa parcela a aproximadamente 84 MiB, além dos Canvas e do restante da página. O limite de `devicePixelRatio` é 2 no desktop e 1,5 no mobile.

Durante um carregamento, o player conserva uma imagem válida. Sem quadro utilizável, permanece o poster. Uma falha no decodificador `ImageBitmap` tenta a decodificação normal de imagem. A aba oculta suspende novas tarefas; a desmontagem remove listeners, observadores, requisições e imagens decodificadas.

No desktop, uma segunda camada Canvas usa o mesmo quadro e a mesma projeção, com uma máscara manual da silhueta. O título HTML fica entre fundo e personagem, evitando duas esculturas desalinhadas. Sua saída usa escala, deslocamento curto e opacidade. Em retratos mobile, a composição do título precisa ficar acima da silhueta para preservar a leitura, pois a escultura ocupa quase toda a largura disponível.

O indicador `data-hands-open` considera o quadro realmente desenhado — índices internos 51 a 100 — e permite ocultar o busto durante saltos em que o quadro antigo ainda mostra mãos fechadas. Também são expostos `data-frame`, `data-target-frame`, `data-progress`, `data-cache-size` e `data-status` para inspeção e testes.

## Identidade, fontes e textos

Foram usados azul noite `#050B16`, azul marinho `#0B1630`, branco mármore `#E8EDF5`, cinza frio `#A9B4C5` e dourado `#C9A55B`, com variações discretas nas bordas e nos destaques. O título recebe tratamento de mármore e veios dourados em CSS. Linhas finas, margens editoriais e áreas de sombra sustentam a legibilidade.

| Fonte | Aplicação |
| --- | --- |
| Cormorant Garamond | Nome monumental, títulos e subtítulos editoriais |
| Manrope | Navegação, corpo de texto, legendas e botões |
| Pinyon Script | Pequenos acentos manuscritos |

As frases laterais da abertura retomam a referência: “Clareza para compreender sua mente e acolher suas emoções” e “Um espaço de escuta, reflexão e autoconhecimento”. Os demais textos foram redigidos para a experiência, incluindo:

- “Nem tudo precisa ser carregado sozinho.”
- “Acolher é abrir espaço para o que você sente.”
- “Olhar para dentro. Encontrar novos sentidos.”
- “Entre quem você é e quem está se tornando.”
- “O primeiro passo pode ser uma conversa.”

Os CTAs preservam os rótulos solicitados: **“Entre em contato conosco”** e **“Nos siga em nossas redes sociais”**. Seus diálogos explicam que se trata de demonstração. O rodapé identifica a clínica como fictícia e a página como projeto conceitual de portfólio. Não foram inventados profissionais, credenciais, avaliações, endereços, contatos ou promessas de resultado clínico. Os metadados usam `noindex` para o projeto demonstrativo.

## Acessibilidade e adaptação

O conteúdo permanece em HTML semântico, fora do Canvas. Há navegação por âncoras, link de salto para contato, foco visível e seções que podem receber foco programaticamente. Painéis ocultos são retirados da interação por `inert`. O diálogo permite fechar pelo teclado e devolve o foco ao acionador.

`prefers-reduced-motion` mantém o poster e disponibiliza todos os capítulos no fluxo normal, sem preload da sequência. Sem JavaScript, o texto e o aviso sobre as ações demonstrativas continuam presentes. O parallax de iluminação é limitado a dispositivos com ponteiro preciso e hover; botões têm movimentos curtos. O enquadramento conserva a proporção dos frames e acompanha o deslocamento final do personagem em retrato.

## Skills verificadas

As seis skills prévias continuam disponíveis localmente em `../.agents/skills/`, sem reinstalação ou mudança de configuração:

| Skill | Aplicação no trabalho |
| --- | --- |
| `$emil-design-eng` | Direção visual, tipografia, espaçamento e acabamento |
| `$cinematic-scroll-storytelling` | Capítulos, camadas e narrativa ligada à rolagem |
| `$scroll-scrubbed-visual-sequence` | Correspondência determinística, carregamento e reversibilidade |
| `$animate` | Entrada, saída e microinterações |
| `$animation-performance` | Cache limitado, propriedades animadas e limpeza de recursos |
| `$review-animations` | Revisão de sincronização, movimento, performance e acessibilidade |

O registro anterior `../RELATORIO-SKILLS-ATHENA.md` confirma reconhecimento nativo pelo Codex das seis skills habilitadas, escopo `repo` e `errors: []`. `../skills-lock.json` registra origens, commits e hashes. Os manifests locais também aparecem no catálogo de skills desta sessão. Na revisão de componentes, foi consultado adicionalmente o guia `vercel:react-best-practices` disponível no ambiente.

## Validações e estado da entrega

| Verificação | Estado registrado |
| --- | --- |
| Inventário, ordem numérica, formatos e dimensões dos 240 frames | Concluído; metadados e folha de contato disponíveis |
| `npm run lint` | Passou na versão final |
| `npm run typecheck` | Passou na versão final |
| `npm run build` | Passou; exportação estática gerada em `out/` |
| `npm start` | Passou; servidor local de exportação testado, sem pacote adicional |
| Testes Playwright e capturas desktop/mobile | 8/8 passaram em 10,7 s contra a exportação estática |
| Navegação por hash, retorno de foco e ausência de foco invisível | Passou: `#escuta`, `#contato`, link de salto, rodapé e diálogos |
| Topo, abertura das mãos, transições, final e scroll reverso | Passou; frame 240 apenas no fundo absoluto; pausa conserva quadro |
| Scroll rápido, recarga intermediária, resize e orientação | Passou nos cenários implementados |
| Mobile, redução de movimento e JavaScript desativado | Passou; poster estático, conteúdo acessível e aviso demonstrativo |
| Falha de carregamento dos frames | Passou; poster permanece e diálogo de contato segue utilizável |
| Telas compactas 320 × 568 e 844 × 390 | Passou; conteúdo final entre cabeçalho e rodapé, CTAs integralmente visíveis e dois diálogos utilizáveis |
| Chrome, Safari e Firefox em aparelhos físicos | Não executado em aparelhos físicos; fora da evidência disponível |
| Métricas de fluidez e memória em celular de entrada | Não medidas; não há afirmação de 60 fps garantidos |

O resultado completo está em `docs/qa/playwright-results.json`: oito esperados, zero inesperados, zero ignorados, zero instáveis. As capturas finais `desktop-*.png`, `mobile-*.png` e `compact-*.png` foram atualizadas pela execução de produção. As imagens `review-*.png` são registros intermediários; não representam a entrega final. Viewports cobertos: 1440 × 900, 1024 × 768, 768 × 1024, 390 × 844, 844 × 390 e 320 × 568.

Houve duas restrições do ambiente durante as verificações: acesso ao localhost bloqueado pelo sandbox e `EPERM` ao atualizar arquivos gerados em `.next`. Os comandos locais necessários foram executados com a permissão do ambiente e passaram. Uma asserção inicialmente buscava texto diretamente em `noscript`, que o mecanismo de texto do Playwright ignora; o teste foi corrigido para verificar o parágrafo visível `.no-script-note`. Não restaram erros desses casos no resultado final. O aviso de terminal sobre `NO_COLOR`/`FORCE_COLOR` não afeta os testes.

## Revisão final de animações

| Antes | Depois | Por quê |
| --- | --- | --- |
| Busto atualizava `left`/`top` durante o scroll | Projeção estática em CSS; somente escala e opacidade acompanham a narrativa (`app/globals.css:115`) | Evita animar propriedades de layout |
| Busto podia surgir sobre um frame antigo de mãos fechadas | Visibilidade também depende do frame desenhado (`components/FrameSequence.tsx:261`) | Preserva a relação entre imagem e marco narrativo durante carregamento |
| Título oculto pela silhueta em retrato | Camada e posição próprias no mobile (`app/globals.css:190`) | Mantém a marca legível com o recorte estreito |
| Link invisível no rodapé ainda recebia foco | `inert` acompanha a revelação (`components/AthenaExperience.tsx:61`) | Evita navegação de teclado para elementos invisíveis |
| Salto visual sem foco ou restauração por URL | Âncoras com histórico e foco no destino (`components/AthenaExperience.tsx:67`) | Torna a navegação previsível pelo teclado e por links diretos |

**Performance:** Canvas usa carregamento e cache limitados; animação de conteúdo usa `transform`/`opacity`. Microinterações de botões ficam em 100–200 ms. A luz decorativa usa 500 ms para suavizar deslocamento máximo pequeno; não é uma ação funcional com resposta retardada.

**Interrupção e coerência:** a sequência e os textos derivam diretamente do scroll, sem autoplay ou avanço residual. Hover pode ser interrompido, e navegação por teclado é instantânea.

**Acessibilidade:** redução de movimento, hover apenas em ponteiro adequado, foco, diálogos e fallback foram verificados. **Decisão: aprovada no escopo testado.** Essa decisão não equivale a certificação completa de acessibilidade ou garantia de fluidez em qualquer aparelho.

## Limitações e próximos refinamentos

1. **Fonte visual 720p.** Ampliações mostram suavidade e compressão já presentes. A sequência original aproxima a câmera e corta parte superior da cabeça em alguns trechos, especialmente entre os frames 60 e 168. O frontend preserva esse conteúdo, sem inventar áreas ausentes.
2. **Referência e frames diferentes.** A abertura reconstrói a linguagem da imagem anexada com título editável e primeiro frame real; não é uma reprodução pixel a pixel de um único raster.
3. **Máscara desktop e composição mobile.** A máscara de silhueta é vetorial e manual, aplicada somente no início. Em retrato, o título sobre a figura preserva o nome da marca quando a figura cobre toda a largura. Uma sequência dedicada a retrato permitiria manter mais espaço lateral.
4. **Rede e decodificação.** Saltos grandes podem mostrar brevemente o frame disponível mais próximo. O índice solicitado continua determinístico; a camada dourada é vinculada também ao estado do quadro efetivamente visível.
5. **Validação em hardware.** Chrome em viewport emulado não substitui Safari iOS, Android físico, diferentes GPUs ou leitores de tela. Esses testes são recomendados antes de publicação real.

Para uma próxima etapa, priorizar material original em maior resolução, uma versão de enquadramento retrato e medição em dispositivos reais. Qualquer transformação em site de clínica real exigirá substituir os comportamentos demonstrativos por contatos e dados institucionais fornecidos e aprovados pelo responsável. Nenhuma dessas integrações foi criada nesta entrega local.
