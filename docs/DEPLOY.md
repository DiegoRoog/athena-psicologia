# Publicação da ATHENA Psicologia

- Site: https://diegoroog.github.io/athena-psicologia/
- Repositório público: https://github.com/DiegoRoog/athena-psicologia
- Branch de desenvolvimento e publicação: `main`.
- Automação: `.github/workflows/pages.yml`.
- Primeiro deploy validado: https://github.com/DiegoRoog/athena-psicologia/actions/runs/41155694747
- Commit da implementação publicada: `987983c467de6edcc1946386a512c1dda33ee030`.

O GitHub Pages usa GitHub Actions como fonte. O workflow instala as dependências pelo lockfile, executa lint, tipos e build, envia o conteúdo de `out/` como artefato e publica o site. O build define `NEXT_PUBLIC_BASE_PATH=/athena-psicologia`. Os caminhos de frames, poster e busto usam o mesmo prefixo dos arquivos gerados pelo Next.js.

A validação passou localmente com o prefixo de publicação e novamente no endereço público: **8/8 cenários Playwright, sem falhas**, incluindo endpoints da sequência, reversão, pausa, recarga, resize, navegação e foco, dois diálogos, telas compactas, redução de movimento, ausência de JavaScript e fallback de frames. O teste online concluiu em 12,7 segundos. As evidências locais ficam em `docs/qa/`; arquivos gerados, caches, dependências e cópias redundantes dos frames não são versionados.

Para atualizar, faça commit e push das mudanças para `main`. O GitHub Actions executa a publicação automaticamente; confira o resultado na aba Actions antes de considerar a nova versão concluída. Não são necessários tokens ou senhas no código ou nos secrets do repositório: o workflow usa o `GITHUB_TOKEN` temporário da própria execução.
