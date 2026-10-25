import { resumeData } from '../../data/resumeData.js';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function createResumeAppContent() {
  const person = resumeData.personal;
  const container = document.createElement('div');
  container.className = 'career-experience';

  container.innerHTML = `
    <header class="career-nav">
      <a class="career-wordmark" href="#home" aria-label="Return home">AS<span> / PROFILE</span></a>
      <a class="career-nav-link" href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
    </header>
    <div class="career-scroll">
      <section class="career-opening">
        <div class="career-opening-aside"><span>ENGINEERING<br />PROFILE</span><span>VERIFIED AGAINST<br />SOURCE RESUME</span></div>
        <div class="career-opening-main">
          <p class="career-kicker">ADITYA SHINDE <span>·</span> ${escapeHTML(person.location)}</p>
          <h1>Building for<br /><em>the real world.</em></h1>
          <p class="career-summary">${escapeHTML(person.summary)}</p>
          <a class="career-download" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download resume <span>.pdf</span> <b>↓</b></a>
        </div>
        <div class="career-opening-mark" aria-hidden="true">AS</div>
      </section>

      <section class="career-section">
        <div class="career-section-heading"><span>01 / EXPERIENCE</span><h2>Where I’ve<br /><em>made a difference.</em></h2></div>
        <div class="career-timeline">
          ${resumeData.experience.map((experience, index) => `
            <article class="career-role">
              <div class="career-role-meta"><span>0${index + 1}</span><span>${escapeHTML(experience.period)}</span></div>
              <div class="career-role-content">
                <div class="career-role-heading">
                  <div><h3>${escapeHTML(experience.role)}</h3><p>${escapeHTML(experience.company)}</p></div>
                  <span class="career-status">${escapeHTML(experience.status)}</span>
                </div>
                <ul>${experience.highlights.map(highlight => `<li>${escapeHTML(highlight)}</li>`).join('')}</ul>
                <div class="career-tech">${experience.technologies.map(technology => `<span>${escapeHTML(technology)}</span>`).join('')}</div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="career-education">
        <div><span class="career-section-label">02 / EDUCATION</span><h2>Education<br /><em>& foundations.</em></h2></div>
        <div class="career-education-detail">
          <span>${escapeHTML(person.university)} · ${escapeHTML(person.educationPeriod)}</span>
          <h3>${escapeHTML(person.degree)}</h3>
          <p>CGPA <b>${escapeHTML(person.cgpa)}</b></p>
        </div>
      </section>
      <footer class="career-footer"><span>GOOD WORK IS A TEAM SPORT.</span><a href="#work" data-portfolio-route="projects">VIEW SELECTED PROJECTS ↗</a></footer>
    </div>
  `;

  return container;
}
