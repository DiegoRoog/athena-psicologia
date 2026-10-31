# ATHENA PSICOLOGIA

Site: https://diegoroog.github.io/athena-psicologia/

## Publicação

O workflow `.github/workflows/pages.yml` valida e publica a exportação estática no GitHub Pages a cada push em `main`. Nas configurações do repositório, Pages deve usar **GitHub Actions** como fonte. O build de publicação define `NEXT_PUBLIC_BASE_PATH=/athena-psicologia`; fontes, scripts, poster, busto e frames respeitam esse prefixo. O desenvolvimento local continua usando a raiz por padrão.

Para conferir a versão de publicação localmente no PowerShell, defina `$env:NEXT_PUBLIC_BASE_PATH='/athena-psicologia'`, execute `npm run build` e `npm start`, e acesse `http://127.0.0.1:3000/athena-psicologia/`. Os testes aceitam `$env:PLAYWRIGHT_BASE_PATH='/athena-psicologia'`.

Landing page conceitual de portfólio com narrativa editorial e 240 imagens controladas pela rolagem. A clínica é fictícia. Os dois botões finais abrem mensagens de demonstração; não realizam agendamentos nem levam a perfis sociais inexistentes.

Todo o código de desenvolvimento está nesta pasta, `athena-landing-page`, dentro do diretório exclusivo `Código Psi`. As skills locais continuam na pasta `.agents/skills` da raiz do projeto.

## Executar localmente

Abra um terminal nesta pasta. As dependências já estão instaladas neste workspace. Somente em uma nova cópia do projeto, instale-as com:

```powershell
npm ci --cache .npm-cache
```

Para desenvolver:

```powershell
npm run dev
```

Acesse `http://127.0.0.1:3000`. Para gerar e visualizar a exportação estática:

```powershell
npm run build
npm start
```

A saída de produção fica em `out/`. O comando `npm start` usa `scripts/serve.mjs`, sem dependência adicional, na porta 3000. Execute apenas uma prévia por vez: encerre `npm run dev` antes de `npm start`. Não é necessário backend, banco de dados, chave de API ou serviço pago. O site também está publicado pelo GitHub Pages no endereço informado acima.

## Verificar

```powershell
npm run lint
npm run typecheck
npm run build
```

Com o servidor local ativo na porta 3000, execute a suíte de navegador em outro terminal:

```powershell
npm run test:e2e
```

A configuração do Playwright utiliza o Google Chrome instalado. Na validação final de 30/10/2026, os oito cenários passaram contra a exportação estática, além de lint, tipos e build. Evidências e capturas ficam em `docs/qa/`. Consulte os detalhes e limites no [relatório de desenvolvimento](docs/RELATORIO-DESENVOLVIMENTO.md).

## Estrutura

```text
app/                         página, metadados, fontes e CSS
components/
  AthenaExperience.tsx       narrativa, navegação e diálogos
  FrameSequence.tsx          Canvas, carregamento e cache dos frames
lib/
  sequence.ts                progresso, índices e enquadramento
  narrative.ts               capítulos e intervalos de visibilidade
public/
  frames/desktop/            240 JPEG originais, 1280 × 720
  frames/mobile/             240 WebP proporcionais, 768 × 432
  images/                    busto dourado e posters
assets/
  source-frames/             frames originais, fora da pasta pública
  prepare-assets.py          preparação reproduzível dos assets
  sequence-metadata.json     dimensões, pesos e marcos observados
docs/
  reference/                 imagem de referência fornecida
  qa/                        folha de contato e evidências de teste
  RELATORIO-DESENVOLVIMENTO.md
tests/                       cenários Playwright
scripts/serve.mjs             prévia local da exportação estática
```

## Como a sequência funciona

O progresso vem da posição absoluta da página: `scrollY / (scrollHeight - innerHeight)`. Um único `requestAnimationFrame` aplica as atualizações necessárias; não há autoplay nem avanço por relógio. Parar o scroll mantém o quadro; voltar reverte a sequência. O frame 240 é reservado ao final efetivo da página.

O player prioriza o frame solicitado e os vizinhos, com até quatro carregamentos simultâneos no desktop e três no mobile. O cache decodificado é limitado a 24 e 18 imagens, respectivamente. Enquanto o alvo carrega, permanece um quadro válido próximo ou o poster inicial. A aba oculta suspende trabalho; listeners, requisições e bitmaps são liberados ao desmontar.

Textos, navegação e botões são HTML. Com redução de movimento, a sequência fica estática e os capítulos seguem no fluxo normal. Sem JavaScript, o conteúdo e um aviso sobre os botões demonstrativos continuam disponíveis.

## Editar e continuar

- Textos, CTAs e estrutura das seções: `components/AthenaExperience.tsx`.
- Tipografia, cores, composição e responsividade: `app/globals.css`.
- Janelas da narrativa: `lib/narrative.ts`.
- Carregamento, memória e camadas da sequência: `components/FrameSequence.tsx`.
- Projeção e correspondência scroll/frame: `lib/sequence.ts`.
- Origem e preparação das imagens: [assets/README.md](assets/README.md).

As seis skills já instaladas podem ser citadas nos próximos prompts: `$emil-design-eng`, `$cinematic-scroll-storytelling`, `$scroll-scrubbed-visual-sequence`, `$animate`, `$animation-performance` e `$review-animations`. Não é necessário reinstalá-las. O registro de instalação e reconhecimento está em `../RELATORIO-SKILLS-ATHENA.md`.

Exemplo: “Use `$review-animations` e `$animation-performance` para revisar a sequência da ATHENA nesta pasta, preservando os assets e a identidade visual.”

O material original tem resolução 720p e contém aproximações que cortam parte da cabeça. Esses limites fazem parte dos frames recebidos; aumentar o Canvas não recupera detalhes ausentes. Veja as decisões de composição e limitações no relatório.
