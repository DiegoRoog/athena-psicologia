'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import FrameSequence from './FrameSequence';
import { chapters, clamp01, visibility } from '@/lib/narrative';
import { assetPath } from '@/lib/asset-path';

const chapterPositions: Record<string, number> = { inicio: 0, escuta: .30, perceber: .56, caminho: .78, contato: 1 };

function Arrow({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={down ? 'arrow-down' : ''}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
function Monogram() {
  return <svg aria-hidden="true" viewBox="0 0 44 44" width="38" height="38" fill="none"><path d="M9 34 22 8l13 26M14 24h16M6 34h11m10 0h11" stroke="currentColor" strokeWidth="1.1"/><path d="M22 8v26" stroke="currentColor" strokeWidth=".5" opacity=".55"/></svg>;
}

export default function AthenaExperience() {
  const root = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const title = useRef<HTMLHeadingElement>(null);
  const bust = useRef<HTMLDivElement>(null);
  const progressLine = useRef<HTMLDivElement>(null);
  const chapterNumber = useRef<HTMLSpanElement>(null);
  const chapterLabel = useRef<HTMLSpanElement>(null);
  const footer = useRef<HTMLElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [dialogKind, setDialogKind] = useState<'contact' | 'social'>('contact');

  const update = useCallback((p: number) => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.current.dataset.enhanced = 'true';
    let active = 0;
    chapters.forEach((chapter, i) => {
      const panel = panelRefs.current[i];
      if (!panel) return;
      const amount = i === 0 ? 1 - clamp01(p / .09) : visibility(p, chapter.start, chapter.end);
      panel.style.opacity = String(amount);
      panel.style.visibility = amount > 0 ? 'visible' : 'hidden';
      panel.style.transform = `translate3d(0,${(1 - amount) * 18}px,0)`;
      panel.inert = amount < .4;
      panel.setAttribute('aria-hidden', String(amount < .05));
      if (p >= chapter.start) active = i;
    });
    if (title.current) {
      const retreat = clamp01(p / .105);
      title.current.style.transform = `translate3d(0,${retreat * -18}px,0) scale(${1 - retreat * .26})`;
      title.current.style.opacity = String(1 - clamp01((p - .025) / .065));
    }
    if (bust.current) {
      const amount = visibility(p, 51 / 239, 100 / 239, .035);
      bust.current.style.opacity = String(amount);
      bust.current.style.transform = `translate(-50%,-50%) scale(${.94 + amount * .06})`;
    }
    if (progressLine.current) progressLine.current.style.transform = `scaleX(${p})`;
    if (chapterNumber.current) chapterNumber.current.textContent = `0${active + 1}`;
    if (chapterLabel.current) chapterLabel.current.textContent = chapters[active].label;
    if (footer.current) {
      const amount = clamp01((p - .96) / .025);
      footer.current.style.opacity = String(amount);
      footer.current.inert = amount < .4;
      footer.current.setAttribute('aria-hidden', String(amount < .05));
    }
    root.current.dataset.chapter = String(active);
  }, []);

  const navigate = useCallback((id: string, focus = false) => {
    const destination = document.getElementById(id);
    const p = chapterPositions[id];
    if (!destination || p === undefined) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      destination.scrollIntoView();
    } else {
      update(p);
      window.scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' });
    }
    if (focus) destination.focus({ preventScroll: true });
  }, [update]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const reset = () => {
      if (media.matches && root.current) {
        delete root.current.dataset.enhanced;
        panelRefs.current.forEach(panel => {
          if (panel) { panel.removeAttribute('style'); panel.removeAttribute('aria-hidden'); panel.inert = false; }
        });
        title.current?.removeAttribute('style');
        if (footer.current) { footer.current.removeAttribute('style'); footer.current.removeAttribute('aria-hidden'); footer.current.inert = false; }
      }
    };
    media.addEventListener('change', reset);
    const handlePointer = (event: PointerEvent) => {
      if (media.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (glow.current) glow.current.style.transform = `translate3d(${(event.clientX / innerWidth - .5) * 16}px,${(event.clientY / innerHeight - .5) * 12}px,0)`;
    };
    window.addEventListener('pointermove', handlePointer, { passive: true });
    const restoreHash = () => navigate(location.hash.slice(1));
    const initialNavigation = requestAnimationFrame(restoreHash);
    window.addEventListener('hashchange', restoreHash);
    window.addEventListener('popstate', restoreHash);
    return () => {
      cancelAnimationFrame(initialNavigation);
      media.removeEventListener('change', reset);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('hashchange', restoreHash);
      window.removeEventListener('popstate', restoreHash);
    };
  }, [navigate]);

  function goTo(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const hash = event.currentTarget.hash;
    if (location.hash !== hash) history.pushState(null, '', hash);
    navigate(hash.slice(1), true);
  }
  function openDemo(kind: 'contact' | 'social', button: HTMLElement) {
    returnFocus.current = button;
    setDialogKind(kind);
    dialog.current?.showModal();
  }
  function closeDemo() { dialog.current?.close(); returnFocus.current?.focus(); }

  return <div className="athena" ref={root}>
    <a className="skip-link" href="#contato" onClick={goTo}>Ir para as opções de contato</a>
    <FrameSequence onProgress={update} />
    <div className="atmosphere" aria-hidden="true" ref={glow} />
    <div className="vignette" aria-hidden="true" />

    <header className="site-header">
      <a href="#inicio" className="wordmark" aria-label="ATHENA Psicologia, início" onClick={goTo}><Monogram /><span>ATHENA<small>PSICOLOGIA</small></span></a>
      <nav aria-label="Navegação principal"><a href="#escuta" onClick={goTo}>A escuta</a><a href="#caminho" onClick={goTo}>O caminho</a></nav>
      <a className="header-cta" href="#contato" onClick={goTo}>Comece por você <Arrow /></a>
    </header>

    <main className="experience" id="experiencia">
      <h1 className="hero-title" ref={title}><span>ATHENA</span><span>PSICOLOGIA</span></h1>
      <div className="golden-emblem" ref={bust} aria-hidden="true"><div className="emblem-halo" /><img src={assetPath('/images/golden-bust.webp')} alt="" width="640" height="640" /></div>

      <section id="inicio" tabIndex={-1} className="scene scene-hero" ref={node => { panelRefs.current[0] = node; }} aria-label="Um olhar para dentro">
        <div className="hero-kicker"><span className="fine-line" /> UM OLHAR PARA DENTRO</div>
        <div className="hero-note hero-note-left"><span className="gold-rule"/><p>Clareza para compreender<br/>sua mente e acolher<br/>suas emoções.</p></div>
        <div className="hero-note hero-note-right"><span className="gold-rule"/><p>Um espaço de escuta,<br/>reflexão e autoconhecimento.</p><span className="handwritten">No seu tempo.</span></div>
        <a href="#escuta" className="scroll-invitation" onClick={goTo}><span>PERMITA-SE DESCOBRIR</span><span className="scroll-arrow"><Arrow down /></span></a>
      </section>

      <section id="escuta" tabIndex={-1} className="scene scene-open" ref={node => { panelRefs.current[1] = node; }} aria-labelledby="escuta-heading">
        <div className="side-copy left-copy"><p className="eyebrow">01 / O ESPAÇO DA ESCUTA</p><h2 id="escuta-heading">Nem tudo precisa<br/>{' '}ser carregado<br/>{' '}<em>sozinho.</em></h2><p className="body-copy">Há pensamentos que ganham contorno quando encontram espaço. E sentimentos que precisam de escuta antes de respostas.</p></div>
        <div className="side-copy right-copy"><span className="gold-rule"/><h3>Acolher é abrir<br/>{' '}espaço para o<br/>{' '}<em>que você sente.</em></h3><p className="body-copy">Aqui, a sua história pode ser contada com calma. Sem pressa de chegar. Sem precisar ter tudo resolvido.</p></div>
      </section>

      <section id="perceber" tabIndex={-1} className="scene scene-reflect" ref={node => { panelRefs.current[2] = node; }} aria-labelledby="perceber-heading">
        <div className="reflection-copy"><p className="eyebrow">02 / O ENCONTRO CONSIGO</p><h2 id="perceber-heading">Olhar para dentro.<br/><em>Encontrar novos sentidos.</em></h2><p className="body-copy">Compreender o que se repete. Reconhecer o que pesa.<br className="desktop-break"/> Dar palavras ao que, por muito tempo, ficou em silêncio.</p><span className="handwritten">Você não precisa ter todas as respostas.</span></div>
        <p className="margin-note">AUTOCONHECIMENTO É UM CAMINHO,<br/>NÃO UM PONTO DE CHEGADA.</p>
      </section>

      <section id="caminho" tabIndex={-1} className="scene scene-path" ref={node => { panelRefs.current[3] = node; }} aria-labelledby="caminho-heading">
        <div className="editorial-copy"><p className="eyebrow">03 / UM NOVO SENTIDO</p><h2 id="caminho-heading">Entre quem você é<br/>e quem está<br/><em>se tornando.</em></h2><p className="body-copy">A psicologia oferece um espaço para investigar a própria experiência, elaborar emoções e construir outras maneiras de estar na vida.</p><div className="principles"><p><span>01</span>Escuta que respeita a sua singularidade.</p><p><span>02</span>Reflexão que acolhe as suas perguntas.</p><p><span>03</span>Um percurso construído no seu tempo.</p></div></div>
      </section>

      <section id="contato" tabIndex={-1} className="scene scene-finale" ref={node => { panelRefs.current[4] = node; }} aria-labelledby="contato-heading">
        <div className="editorial-copy"><p className="eyebrow">04 / O SEU PRÓXIMO PASSO</p><h2 id="contato-heading">O primeiro passo<br/>pode ser uma<br/><em>conversa.</em></h2><p className="body-copy">Talvez você ainda não saiba por onde começar.<br/>Podemos começar por essa pergunta.</p><div className="final-actions"><button className="button button-gold" onClick={event => openDemo('contact', event.currentTarget)}>Entre em contato conosco <Arrow /></button><button className="button button-outline" onClick={event => openDemo('social', event.currentTarget)}>Nos siga em nossas redes sociais <Arrow /></button></div><span className="handwritten">Um novo olhar começa em você.</span></div>
        <noscript><p className="no-script-note">Projeto demonstrativo: não há atendimento ou perfis sociais reais. Ative o JavaScript para explorar as interações dos botões.</p></noscript>
      </section>
    </main>

    <aside className="journey-status" aria-label="Progresso da experiência"><div className="chapter-index"><span ref={chapterNumber}>01</span><span className="index-divider"/>05</div><span ref={chapterLabel}>O primeiro olhar</span><span className="journey-end">ESCUTA. PRESENÇA. SENTIDO.</span></aside>
    <div className="journey-line" aria-hidden="true"><div ref={progressLine}/></div>
    <footer className="site-footer" ref={footer}><span>ATHENA PSICOLOGIA</span><p>Clínica fictícia · Projeto conceitual de portfólio</p><a href="#inicio" onClick={goTo}>Voltar ao início ↑</a></footer>

    <dialog ref={dialog} className="demo-dialog" aria-labelledby="demo-title" onClick={event => { if (event.target === event.currentTarget) closeDemo(); }} onClose={() => returnFocus.current?.focus()}>
      <button className="dialog-close" onClick={closeDemo} aria-label="Fechar mensagem">×</button><Monogram/><p className="eyebrow">ATHENA · PROJETO CONCEITUAL</p><h2 id="demo-title">{dialogKind === 'contact' ? 'Toda conversa começa com uma abertura.' : 'Outros olhares. A mesma essência.'}</h2><p>{dialogKind === 'contact' ? 'Este é um projeto demonstrativo de portfólio. A ATHENA é uma clínica fictícia: não há agendamentos ou atendimento por esta página.' : 'Os perfis sociais desta marca são demonstrativos e ainda não existem. Este botão apresenta a interação prevista para uma versão real.'}</p><button className="button button-gold" onClick={closeDemo}>Continuar explorando <Arrow /></button>
    </dialog>
  </div>;
}
