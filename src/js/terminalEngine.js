import { resumeData } from '../data/resumeData.js';
import { sound } from './soundEngine.js';

const portfolioSections = ['about', 'experience', 'projects', 'skills', 'resume.pdf', 'contact'];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export class TerminalEngine {
  constructor(terminalContainer, windowManager) {
    this.container = terminalContainer;
    this.wm = windowManager;
    this.history = [];
    this.historyIndex = -1;
    this.commands = {};

    this.initDOM();
    this.registerCommands();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="terminal-body" id="term-body">
        <header class="terminal-welcome">
          <span class="terminal-kicker">ADITYA SHINDE / PORTFOLIO CONSOLE</span>
          <p>A command-line index to the projects, experience, and resume on this site.</p>
          <p class="terminal-hint">Type <kbd>help</kbd> to see commands, or <kbd>open work</kbd> to browse selected work.</p>
        </header>
        <div id="term-output" aria-live="polite"></div>
        <div class="term-input-line">
          <label class="term-prompt" for="term-input"><span aria-hidden="true">$</span><span>aditya</span></label>
          <input type="text" class="term-input" id="term-input" autocomplete="off" spellcheck="false" aria-label="Enter a portfolio command" placeholder="Type a command…" autofocus />
        </div>
      </div>
    `;

    this.output = this.container.querySelector('#term-output');
    this.input = this.container.querySelector('#term-input');
    this.body = this.container.querySelector('#term-body');
    this.setupListeners();
  }

  setupListeners() {
    this.container.addEventListener('click', event => {
      if (event.target !== this.input && !event.target.closest('a')) this.input.focus();
    });

    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const command = this.input.value.trim();
        this.input.value = '';
        if (command) {
          this.history.push(command);
          this.historyIndex = this.history.length;
          this.executeCommand(command);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.historyIndex > 0) this.input.value = this.history[--this.historyIndex];
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.input.value = this.history[++this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.input.value = '';
        }
      } else if (event.key === 'Tab') {
        event.preventDefault();
        this.handleTabAutocomplete();
      }
      if (event.key.length === 1 || event.key === 'Backspace') sound.playKeySound();
    });
  }

  handleTabAutocomplete() {
    const value = this.input.value.trim().toLowerCase();
    if (!value) return;

    const available = [...Object.keys(this.commands), ...portfolioSections];
    const matches = [...new Set(available)].filter(command => command.startsWith(value));
    if (matches.length === 1) this.input.value = matches[0];
    else if (matches.length > 1) this.printLine(`Suggestions: ${matches.map(escapeHTML).join(' · ')}`, 'term-muted');
  }

  registerCommands() {
    this.commands = {
      help: () => this.cmdHelp(),
      about: () => this.cmdAbout(),
      bio: () => this.cmdAbout(),
      skills: () => this.cmdSkills(),
      experience: () => this.cmdExperience(),
      work: () => this.cmdProjects(),
      projects: () => this.cmdProjects(),
      open: args => this.cmdOpen(args),
      ls: () => this.cmdList(),
      cat: args => this.cmdRead(args),
      contact: () => this.cmdContact(),
      hire: () => this.cmdContact(),
      clear: () => this.cmdClear(),
      whoami: () => this.printLine(`${escapeHTML(resumeData.personal.name)} — ${escapeHTML(resumeData.personal.title)}`),
      date: () => this.printLine(escapeHTML(new Date().toLocaleString())),
      echo: args => this.printLine(escapeHTML(args.join(' ')))
    };
  }

  executeCommand(commandText) {
    this.printPromptLine(commandText);
    const [command, ...args] = commandText.split(/\s+/);
    const handler = this.commands[command.toLowerCase()];
    if (handler) {
      handler(args);
    } else {
      this.printLine(`Unknown command: ${escapeHTML(command)}. Type <span class="term-command">help</span> for the available commands.`, 'term-error');
    }
  }

  printPromptLine(commandText) {
    const line = document.createElement('div');
    line.className = 'term-command-line';
    line.innerHTML = `<span class="term-command-prompt">$ aditya</span><span>${escapeHTML(commandText)}</span>`;
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  printLine(content, className = '') {
    const line = document.createElement('div');
    line.className = `term-line ${className}`;
    line.innerHTML = content;
    this.output.appendChild(line);
    this.scrollToBottom();
  }

  scrollToBottom() {
    this.body.scrollTop = this.body.scrollHeight;
  }

  cmdHelp() {
    const commands = [
      ['about', 'Read the professional summary'],
      ['experience', 'Browse roles and documented contributions'],
      ['projects', 'View projects listed on the resume'],
      ['skills', 'List the resume skills by category'],
      ['open [section]', 'Open work, resume, skills, contact, or terminal'],
      ['ls', 'List the available portfolio sections'],
      ['cat [section]', 'Read about, skills, projects, experience, or resume PDF'],
      ['contact', 'Show direct contact details'],
      ['date', 'Show the current local date and time'],
      ['clear', 'Clear the console']
    ];
    this.printLine(`<section class="term-card"><h2>COMMANDS</h2><dl>${commands.map(([command, description]) => `<div><dt>${escapeHTML(command)}</dt><dd>${escapeHTML(description)}</dd></div>`).join('')}</dl></section>`);
  }

  cmdAbout() {
    this.printLine(`<section class="term-card"><h2>ABOUT</h2><p>${escapeHTML(resumeData.personal.summary)}</p></section>`);
  }

  cmdSkills() {
    const groups = [
      ['Languages', resumeData.skills.languages],
      ['Backend', resumeData.skills.backend],
      ['Frontend', resumeData.skills.frontend],
      ['Databases', resumeData.skills.databases],
      ['Architecture', resumeData.skills.architecture],
      ['Tools', resumeData.skills.toolsAndDevops]
    ];
    this.printLine(`<section class="term-card"><h2>SKILLS · RESUME INVENTORY</h2>${groups.map(([name, values]) => `<div class="term-skill-group"><h3>${escapeHTML(name)}</h3><p>${values.map(escapeHTML).join(' · ')}</p></div>`).join('')}</section>`);
  }

  cmdExperience() {
    this.printLine(`<section class="term-card"><h2>EXPERIENCE</h2>${resumeData.experience.map(experience => `
      <article class="term-record">
        <h3>${escapeHTML(experience.role)} · ${escapeHTML(experience.company)}</h3>
        <p class="term-muted">${escapeHTML(experience.period)}</p>
        <ul>${experience.highlights.map(highlight => `<li>${escapeHTML(highlight)}</li>`).join('')}</ul>
      </article>
    `).join('')}</section>`);
  }

  cmdProjects() {
    this.printLine(`<section class="term-card"><h2>PROJECTS · RESUME LISTING</h2>${resumeData.projects.map(project => `
      <article class="term-record">
        <h3>${escapeHTML(project.title)}</h3>
        ${project.period ? `<p class="term-muted">${escapeHTML(project.period)}</p>` : ''}
        <p>${escapeHTML(project.tech.join(' · '))}</p>
        <ul>${project.highlights.map(highlight => `<li>${escapeHTML(highlight)}</li>`).join('')}</ul>
      </article>
    `).join('')}</section>`);
  }

  cmdList() {
    this.printLine(`<section class="term-card"><h2>AVAILABLE PORTFOLIO SECTIONS</h2><ul class="term-section-list">${portfolioSections.map(section => `<li>${escapeHTML(section)}</li>`).join('')}</ul><p class="term-muted">Use <code>open [section]</code> to navigate.</p></section>`);
  }

  cmdRead(args) {
    const section = (args[0] || '').toLowerCase();
    const readers = {
      about: () => this.cmdAbout(),
      skills: () => this.cmdSkills(),
      experience: () => this.cmdExperience(),
      projects: () => this.cmdProjects(),
      work: () => this.cmdProjects()
    };
    if (readers[section]) readers[section]();
    else if (section === 'resume.pdf' || section === 'resume') {
      this.printLine('<a class="term-download-link" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download the verified PDF resume ↓</a>');
    } else {
      this.printLine(`No readable portfolio section named "${escapeHTML(section)}". Try <span class="term-command">ls</span>.`, 'term-error');
    }
  }

  cmdOpen(args) {
    const section = (args[0] || '').toLowerCase();
    if (section === 'resume.pdf') {
      this.cmdRead(['resume.pdf']);
      return;
    }
    const app = section === 'work' ? 'projects' : section;
    if (['projects', 'resume', 'skills', 'contact', 'terminal'].includes(app) && window.openAppByName) {
      window.openAppByName(app);
      this.printLine(`Opened ${escapeHTML(section)}.`, 'term-success');
    } else {
      this.printLine('Usage: open [work|projects|resume|skills|contact|terminal]', 'term-error');
    }
  }

  cmdContact() {
    const person = resumeData.personal;
    this.printLine(`<section class="term-card"><h2>CONTACT</h2><p><a href="mailto:${escapeHTML(person.email)}">${escapeHTML(person.email)}</a></p><p>${escapeHTML(person.phone)}</p><p>${escapeHTML(person.location)}</p></section>`);
    if (window.openAppByName) window.openAppByName('contact');
  }

  cmdClear() {
    this.output.replaceChildren();
  }
}
