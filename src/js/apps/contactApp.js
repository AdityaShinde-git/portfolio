import { resumeData } from '../../data/resumeData.js';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function createContactAppContent() {
  const person = resumeData.personal;
  const container = document.createElement('div');
  container.className = 'contact-experience';

  container.innerHTML = `
    <header class="contact-nav">
      <a class="contact-wordmark" href="#home" aria-label="Return home">AS<span> / CONTACT</span></a>
      <span class="contact-nav-note">ADITYA SHINDE · ${escapeHTML(person.location.split(',')[0])}</span>
      <a href="#work" data-portfolio-route="projects" class="contact-nav-link">SEE MY WORK ↗</a>
    </header>
    <div class="contact-scroll">
      <section class="contact-opening">
        <div class="contact-opening-copy">
          <p class="contact-kicker">FOR GOOD QUESTIONS & GOOD WORK</p>
          <h1>Have something<br />worth <em>building?</em></h1>
          <p class="contact-lede">I’m a backend and full-stack software engineer working across applications, APIs, and data systems. If there’s a role or a problem you think could be a fit, I’d be glad to hear from you.</p>
          <a class="contact-email-cta" href="mailto:${escapeHTML(person.email)}">Write me an email <span>↗</span></a>
        </div>
        <div class="contact-orbit-art" aria-hidden="true">
          <div class="contact-orbit orbit-a"></div><div class="contact-orbit orbit-b"></div>
          <div class="contact-orbit-core"><span>AS</span><small>OPEN CHANNEL</small></div>
          <span class="contact-orbit-label orbit-label-a">SOFTWARE</span>
          <span class="contact-orbit-label orbit-label-b">SYSTEMS</span>
        </div>
      </section>
      <section class="contact-details">
        <div><span>EMAIL</span><a href="mailto:${escapeHTML(person.email)}">${escapeHTML(person.email)} <b>↗</b></a></div>
        <div><span>PHONE</span><a href="tel:${escapeHTML(person.phone.replace(/[^0-9+]/g, ''))}">${escapeHTML(person.phone)} <b>↗</b></a></div>
        <div><span>LOCATION</span><p>${escapeHTML(person.location)}</p></div>
        <div><span>ELSEWHERE</span><p><a href="${escapeHTML(person.githubUrl)}" target="_blank" rel="noreferrer">GitHub ↗</a><a href="${escapeHTML(person.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn ↗</a></p></div>
      </section>
      <footer class="contact-footer"><span>THANK YOU FOR TAKING A LOOK.</span><a href="#resume" data-portfolio-route="resume">A LITTLE MORE ABOUT ME ↗</a></footer>
    </div>
  `;

  return container;
}
