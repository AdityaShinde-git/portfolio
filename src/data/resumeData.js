export const resumeData = {
  personal: {
    name: "Aditya Shinde",
    title: "Backend / Full-Stack Software Engineer",
    email: "aditya12rash@gmail.com",
    phone: "(+91) 9324284783",
    location: "Virar, Maharashtra - 401303",
    github: "github.com/AdityaShinde-git",
    githubUrl: "https://github.com/AdityaShinde-git",
    linkedin: "linkedin.com/in/aditya-shinde-5a031b305",
    linkedinUrl: "https://linkedin.com/in/aditya-shinde-5a031b305",
    cgpa: "8.0 / 10",
    degree: "Bachelor of Science in Information Technology",
    university: "University of Mumbai",
    educationPeriod: "Aug 2022 – Apr 2025",
    summary: "Backend / Full-Stack Software Engineer experienced in building and maintaining production web applications, REST APIs, business modules, and database-driven systems. Strong experience with PHP, Laravel, CodeIgniter 4, MySQL, PostgreSQL, React, JavaScript, and TypeScript, with additional experience building Rust-based real-time CDC and data synchronization systems. Experienced in MVC architecture, RBAC, audit trails, CRUD workflows, email automation, and production feature development."
  },

  experience: [
    {
      id: "vk-lalco",
      company: "V.K. Lalco",
      role: "Software Developer",
      period: "Jun 2026 – Present",
      status: "Current Role",
      technologies: ["PHP", "Laravel", "CodeIgniter", "MySQL", "PostgreSQL", "React", "JavaScript", "TypeScript"],
      highlights: [
        "Developed and maintained production web applications using PHP, Laravel, CodeIgniter, MySQL, PostgreSQL, React, JavaScript, and TypeScript.",
        "Designed and developed a centralized Update Management System (UMS) to track module-level changes, responsible users, timestamps, and detailed audit trails across the application.",
        "Implemented role-based access control (RBAC) for UMS and application features, ensuring users could access actions and data according to their roles and permissions.",
        "Built an integrated email workflow for completed module updates, supporting configurable recipients, CC, BCC, delivery status, and system-generated notifications.",
        "Added and maintained new features across existing modules, including backend logic, database changes, REST APIs, validation, and frontend updates.",
        "Worked on production fixes, feature enhancements, database operations, and application maintenance while ensuring existing functionality remained stable."
      ]
    },
    {
      id: "volody",
      company: "Volody",
      role: "Software Developer Intern",
      period: "Mar 2026 – Jun 2026",
      status: "Internship",
      technologies: ["PHP", "Laravel", "React", "JavaScript", "TypeScript", "MySQL", "PostgreSQL"],
      highlights: [
        "Developed and maintained production features using PHP, Laravel, React, JavaScript, TypeScript, MySQL, and PostgreSQL.",
        "Built and integrated REST APIs for application features and backend business workflows.",
        "Worked on database-driven features, query optimization, validation, CRUD operations, and application-level business logic.",
        "Resolved production issues and implemented enhancements across existing modules while following MVC and maintainable coding practices."
      ]
    },
    {
      id: "k2s2",
      company: "K2S2 Digistrat",
      role: "Software Developer Intern",
      period: "Sep 2025 – Feb 2026",
      status: "Internship",
      technologies: ["CodeIgniter 4", "PHP", "Rust", "REST APIs"],
      highlights: [
        "Built and integrated REST APIs for production systems and developed database-driven features using CodeIgniter 4.",
        "Developed a Lead Management System with relational data, nested CRUD operations, validation, and reusable backend business logic.",
        "Contributed to a Railway Management System through database schema updates, backend changes, and user-interface enhancements.",
        "Built a Rust-based Data Sync Platform supporting bulk data migration and real-time Change Data Capture (CDC) operations."
      ]
    }
  ],

  projects: [
    {
      id: "oms-hrms",
      title: "Office / HR Management System (OMS)",
      subtitle: "Full-stack HR management platform",
      overview: "A full-stack HRMS covering employee management, attendance, leave, payroll, holidays, announcements, tickets, and self-service.",
      areas: ["Employee management", "Attendance", "Leave", "Payroll", "Holidays", "Announcements", "Tickets & self-service"],
      tech: ["PHP", "CodeIgniter 4", "MySQL", "Bootstrap 5"],
      highlights: [
        "Built a full-stack HR management system across multiple interconnected workplace modules."
      ],
      implementation: [
        "MVC + Service architecture with thin controllers, reusable business logic, validation, and database-driven workflows.",
        "Role-based access control with roles, permissions, route-level authorization, and audit logging for significant operations.",
        "REST-based backend workflows and CRUD operations across multiple modules."
      ],
      source: "Resume · Projects"
    },
    {
      id: "dafca-chat",
      title: "Dafca – Real-Time Chat Application",
      subtitle: "Real-time messaging with persistent conversations and file sharing",
      overview: "A real-time messaging platform with persistent conversations, file sharing, and backend APIs for real-time communication.",
      areas: ["Persistent conversations", "File sharing", "Backend APIs"],
      tech: ["React", "Express.js", "MongoDB"],
      period: "Jan 2025 – Apr 2025",
      highlights: [
        "Built a real-time messaging platform using React, Express.js, and MongoDB."
      ],
      source: "Resume · Projects"
    }
  ],

  skills: {
    languages: ["PHP", "JavaScript", "TypeScript", "Rust", "Python", "C++"],
    backend: ["Laravel", "CodeIgniter 4", "Node.js", "Express.js", "REST APIs", "MVC", "CRUD", "Authentication", "RBAC"],
    frontend: ["React.js", "TypeScript", "JavaScript", "HTML", "CSS", "Bootstrap", "Material UI"],
    databases: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
    architecture: ["Service Layer", "Role-Based Access Control", "Audit Logging", "API Integration", "Real-Time Data Systems", "Change Data Capture (CDC)"],
    toolsAndDevops: ["Git", "Docker", "VMware", "Android Studio", "Postman"]
  },
  additional: {
    hobbies: ["Football", "Gym", "Cycling"],
    languages: ["English (B1 Proficiency)"]
  }
};
