import React from "react";
import LightPillar from "./LightPillar";
import "./App.css";

export default function App() {
  return (
    <div className="page">
      <LightPillar
        className="pillar"
        topColor="#5227FF"
        bottomColor="#FF9FFC"
        intensity={1}
        rotationSpeed={0.3}
        glowAmount={0.002}
        pillarWidth={3}
        pillarHeight={0.4}
        noiseIntensity={0.5}
        pillarRotation={25}
        interactive={false}
        mixBlendMode="screen"
        quality="high"
      />

      <header className="header">
        <img src="/noex-removebg-preview.png" alt="NOEX" className="logo" />

        <nav className="menu">
          <a href="#sobre">Sobre</a>
          <a href="#portfolio">Portfólio</a>
          <a href="#contato">Contato</a>
        </nav>
      </header>

      <main className="content">
        <section id="sobre" className="sobre">
          <div className="sobreLayout">
            <div className="layout">
              <img src="layout.png" alt="Mockup NOEX" />
            </div>

            <div className="sobreCard">
              <div>
                <h1>NOEX </h1>
                <h2>Agency</h2>
              </div>
              
              <p>
                A NOEX Agency desenvolve soluções digitais modernas unindo UI/UX e
                desenvolvimento web. Criamos sites e interfaces com foco em clareza,
                performance e identidade visual forte, transformando ideias em produtos
                digitais bem estruturados.
              </p>

              <h2 className="sobreSlogan">NOEX — do layout ao código.</h2>
            </div>
          </div>
        </section>
      </main>
      <section className="portifolio">
        <h1>Portifólio</h1>
        <div>
          <p>Este site está em fase de desenvolvimento contínuo. Algumas seções e 
            funcionalidades ainda estão sendo finalizadas para garantir a melhor 
            experiência, performance e clareza de navegação. Novos projetos, páginas 
            e recursos estão sendo adicionados progressivamente. A NOEX trabalha com
            evolução constante — transformando ideias em produtos digitais sólidos, do
            layout ao código.</p>
        </div>
      </section>
    </div>
  );
}