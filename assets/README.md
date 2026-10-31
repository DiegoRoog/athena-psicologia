# ATHENA — inspeção e preparação dos recursos visuais

Foram encontrados 240 frames JPEG, de 1280 × 720 pixels, no arquivo `ezgif-1e281754596eacd2-jpg.zip` fornecido pelo usuário. O peso total descompactado dos frames é 7.187.424 bytes. A ordenação usa o índice numérico original, do frame 001 ao 240; os nomes de saída usam quatro dígitos, do `frame-0001` ao `frame-0240`.

## Variantes servidas

| Destino | Formato | Dimensões | Peso total | Observação |
| --- | --- | --- | --- | --- |
| `public/frames/desktop` | JPEG | 1280 × 720 | 7.187.424 bytes | Bytes originais preservados, sem recompressão |
| `public/frames/mobile` | WebP | 768 × 432 | 4.790.414 bytes | Redução proporcional com Lanczos, qualidade 60 |

Uma conversão de teste para WebP desktop qualidade 82 elevou o tamanho total para 12.552.792 bytes. Por isso, a versão final desktop mantém o JPEG original: menor download e fidelidade integral. Os WebP desktop de teste foram removidos.

Os originais ficam em `assets/source-frames`; essa pasta não é servida pelo site. O script `prepare-assets.py` reproduz a preparação dos recursos a partir dos arquivos fornecidos, sem geração de imagens ou mudanças no conteúdo visual.

## Marcos observados

A inspeção foi feita na folha de contato `docs/qa/sequence-contact-sheet.jpg` e em frames individuais.

| Frames (base 1) | Progresso aproximado | Composição |
| --- | --- | --- |
| 1–12 | 0–0,046 | Escultura centralizada, mãos juntas |
| 24–48 | 0,096–0,197 | Mãos começam a abrir; câmera aproxima |
| 48–96 | 0,197–0,397 | Palmas abertas; extensão máxima em torno de 72–84 |
| 108–144 | 0,448–0,598 | Mãos retornam e se unem; enquadramento próximo |
| 156–192 | 0,649–0,799 | Câmera recua e personagem desloca-se à direita |
| 192–240 | 0,799–1 | Escultura à direita; espaço editorial à esquerda |

Janela sugerida para o busto dourado: entrada nos frames 52–62, permanência em 62–90, saída em 90–102. Essa janela termina antes de as mãos retornarem ao centro. No frame 72, o centro do peito está aproximadamente em `(640, 305)` nas coordenadas originais de 1280 × 720; a camada deve acompanhar o mesmo ajuste de enquadramento aplicado ao Canvas.

O primeiro frame não contém texto embutido. Ele permite reconstruir o título em HTML sobre o fundo e usar uma máscara de silhueta para a sensação de profundidade, sem empregar o título raster da imagem de referência.

## Imagens fornecidas

- `docs/reference/hero-reference.png`: cópia exata da referência de abertura, 1672 × 940 pixels. Usada como referência de composição; não deve duplicar os textos HTML.
- `public/images/golden-bust.png`: cópia exata do busto dourado, RGBA, 1254 × 1254 pixels; a transparência original foi preservada.
- `public/images/golden-bust.webp`: variante proporcional de 640 × 640, qualidade 85, com transparência; recomendada para a pequena camada sobre o peito.
- `public/images/sequence-poster.jpg`: cópia exata do primeiro frame, recomendada como poster por ser menor que o WebP de qualidade alta.
- `public/images/sequence-poster.webp`: imagem estática do primeiro frame para apresentação inicial/fallback, qualidade 86.

## Limites da fonte

A sequência original foi comprimida com perdas e tem resolução máxima de 1280 × 720. Em telas muito grandes, o aumento mostra a suavidade/artefatos já existentes no material; uma versão original em maior resolução permitiria melhor definição. A partir dos frames 60–168 a câmera original aproxima-se bastante e corta parte superior da cabeça: isso faz parte da sequência fornecida.

A sequência inteira decodificada a 1280 × 720 × 4 canais ocuparia aproximadamente 844 MiB. O player deve utilizar um cache limitado de frames e fechar recursos descartados, em vez de decodificar os 240 frames permanentemente.
