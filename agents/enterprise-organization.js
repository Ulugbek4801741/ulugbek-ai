"use strict";

// 100-seat virtual company structure. This is a role catalogue, not 100 live model sessions.
// The runtime must provision model access, tools, budgets, and permissions before activation.
const chiefExecutive = Object.freeze({
  id: "chief_manager",
  name: "Bosh menejment agenti",
  role: "chief_manager",
  purpose: "Barcha bo‘limlar maqsadi, ustuvorligi, resursi va hisobotlarini muvofiqlashtirish."
});

const departments = [
  {
    "id": "software",
    "name": "Dasturlash va muhandislik",
    "head": {
      "id": "head_software",
      "name": "Kod arxitektori",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "software_01",
        "name": "Backend dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_02",
        "name": "Frontend dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_03",
        "name": "Android dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_04",
        "name": "iOS dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_05",
        "name": "Python dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_06",
        "name": "Java dasturchi",
        "role": "specialist"
      },
      {
        "id": "software_07",
        "name": "API integratsiya mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "software_08",
        "name": "Ma’lumotlar bazasi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "software_09",
        "name": "Kod optimallashtirish mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "ai_research",
    "name": "AI va ilmiy tadqiqot",
    "head": {
      "id": "head_ai_research",
      "name": "AI tadqiqot rahbari",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "ai_research_01",
        "name": "LLM mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_02",
        "name": "Mashinali o‘rganish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_03",
        "name": "Ma’lumotlar muhandisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_04",
        "name": "Prompt muhandisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_05",
        "name": "RAG va bilimlar bazasi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_06",
        "name": "Model baholash mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_07",
        "name": "Ilmiy tadqiqotchi",
        "role": "specialist"
      },
      {
        "id": "ai_research_08",
        "name": "Matematika va statistika mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "ai_research_09",
        "name": "AI etikasi mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "marketing",
    "name": "Marketing va kommunikatsiya",
    "head": {
      "id": "head_marketing",
      "name": "Marketing strateg",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "marketing_01",
        "name": "Bozor tadqiqotchisi",
        "role": "specialist"
      },
      {
        "id": "marketing_02",
        "name": "SEO mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "marketing_03",
        "name": "SMM mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "marketing_04",
        "name": "Kontent strateg",
        "role": "specialist"
      },
      {
        "id": "marketing_05",
        "name": "Reklama kampaniyasi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "marketing_06",
        "name": "Brend menejeri",
        "role": "specialist"
      },
      {
        "id": "marketing_07",
        "name": "Email marketing mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "marketing_08",
        "name": "Analitika mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "marketing_09",
        "name": "Hamkorlik marketingi mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "business",
    "name": "Biznes va menejment",
    "head": {
      "id": "head_business",
      "name": "Biznes strateg",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "business_01",
        "name": "Loyiha menejeri",
        "role": "specialist"
      },
      {
        "id": "business_02",
        "name": "Operatsion menejer",
        "role": "specialist"
      },
      {
        "id": "business_03",
        "name": "Biznes tahlilchi",
        "role": "specialist"
      },
      {
        "id": "business_04",
        "name": "Jarayonlarni optimallashtirish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "business_05",
        "name": "Startap rivojlantirish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "business_06",
        "name": "Hamkorlik va muzokara mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "business_07",
        "name": "Bozor kengaytirish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "business_08",
        "name": "Mahsulot biznes modeli mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "business_09",
        "name": "Tashkiliy rivojlanish mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "finance",
    "name": "Moliya va hisob",
    "head": {
      "id": "head_finance",
      "name": "Moliyaviy rejalashtiruvchi",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "finance_01",
        "name": "Budjet tahlilchisi",
        "role": "specialist"
      },
      {
        "id": "finance_02",
        "name": "Xarajatlar nazoratchisi",
        "role": "specialist"
      },
      {
        "id": "finance_03",
        "name": "Daromad modeli tahlilchisi",
        "role": "specialist"
      },
      {
        "id": "finance_04",
        "name": "Narxlash mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "finance_05",
        "name": "Buxgalteriya yordamchisi",
        "role": "specialist"
      },
      {
        "id": "finance_06",
        "name": "Moliyaviy hisobot mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "finance_07",
        "name": "Investitsiya tadqiqotchisi",
        "role": "specialist"
      },
      {
        "id": "finance_08",
        "name": "Moliyaviy xavf tahlilchisi",
        "role": "specialist"
      },
      {
        "id": "finance_09",
        "name": "Soliq tadqiqotchisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "sales_support",
    "name": "Savdo va mijozlar",
    "head": {
      "id": "head_sales_support",
      "name": "Savdo strateg",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "sales_support_01",
        "name": "Mijozlar muvaffaqiyati mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_02",
        "name": "CRM mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_03",
        "name": "Savdo voronkasi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_04",
        "name": "Mijozlarni qo‘llab-quvvatlash agenti",
        "role": "specialist"
      },
      {
        "id": "sales_support_05",
        "name": "Mijoz tajribasi tahlilchisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_06",
        "name": "Lead generation mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_07",
        "name": "Savdo matnlari mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_08",
        "name": "Shikoyatlar tahlilchisi",
        "role": "specialist"
      },
      {
        "id": "sales_support_09",
        "name": "Mijozlar so‘rovi tadqiqotchisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "product_design",
    "name": "Mahsulot va dizayn",
    "head": {
      "id": "head_product_design",
      "name": "Mahsulot menejeri",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "product_design_01",
        "name": "UI dizayner",
        "role": "specialist"
      },
      {
        "id": "product_design_02",
        "name": "UX tadqiqotchi",
        "role": "specialist"
      },
      {
        "id": "product_design_03",
        "name": "UX yozuvchisi",
        "role": "specialist"
      },
      {
        "id": "product_design_04",
        "name": "Grafik dizayner",
        "role": "specialist"
      },
      {
        "id": "product_design_05",
        "name": "Prototiplash mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "product_design_06",
        "name": "Foydalanish qulayligi sinovchisi",
        "role": "specialist"
      },
      {
        "id": "product_design_07",
        "name": "Mahsulot analitigi",
        "role": "specialist"
      },
      {
        "id": "product_design_08",
        "name": "Accessibility mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "product_design_09",
        "name": "Dizayn tizimi mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "security_legal",
    "name": "Xavfsizlik va huquqiy muvofiqlik",
    "head": {
      "id": "head_security_legal",
      "name": "Xavfsizlik rahbari",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "security_legal_01",
        "name": "Ilova xavfsizligi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_02",
        "name": "Infratuzilma xavfsizligi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_03",
        "name": "Maxfiylik mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_04",
        "name": "Tahdidlarni modellashtirish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_05",
        "name": "Kod auditori",
        "role": "specialist"
      },
      {
        "id": "security_legal_06",
        "name": "Huquqiy tadqiqotchi",
        "role": "specialist"
      },
      {
        "id": "security_legal_07",
        "name": "Litsenziya va mualliflik huquqi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_08",
        "name": "Siyosat va muvofiqlik mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "security_legal_09",
        "name": "Xavfsizlik hodisalari tahlilchisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "education",
    "name": "Ta’lim va tillar",
    "head": {
      "id": "head_education",
      "name": "Ta’lim strateg",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "education_01",
        "name": "O‘quv dasturi dizayneri",
        "role": "specialist"
      },
      {
        "id": "education_02",
        "name": "Ingliz tili o‘qituvchi agenti",
        "role": "specialist"
      },
      {
        "id": "education_03",
        "name": "O‘zbek tili muharriri",
        "role": "specialist"
      },
      {
        "id": "education_04",
        "name": "Tarjimon",
        "role": "specialist"
      },
      {
        "id": "education_05",
        "name": "Texnik yozuvchi",
        "role": "specialist"
      },
      {
        "id": "education_06",
        "name": "Kurs kontenti muallifi",
        "role": "specialist"
      },
      {
        "id": "education_07",
        "name": "Bilimlarni baholash mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "education_08",
        "name": "O‘quvchi yordamchisi",
        "role": "specialist"
      },
      {
        "id": "education_09",
        "name": "Hujjatlashtirish mutaxassisi",
        "role": "specialist"
      }
    ]
  },
  {
    "id": "operations",
    "name": "Infratuzilma va operatsiyalar",
    "head": {
      "id": "head_operations",
      "name": "DevOps mutaxassisi",
      "role": "department_head"
    },
    "specialists": [
      {
        "id": "operations_01",
        "name": "Bulut infratuzilmasi mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "operations_02",
        "name": "CI/CD mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "operations_03",
        "name": "Monitoring mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "operations_04",
        "name": "Zaxira nusxa va tiklash mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "operations_05",
        "name": "Tarmoq muhandisi",
        "role": "specialist"
      },
      {
        "id": "operations_06",
        "name": "Kompyuter avtomatlashtirish mutaxassisi",
        "role": "specialist"
      },
      {
        "id": "operations_07",
        "name": "Texnik yordam mutaxassisi",
        "role": "specialist"
      }
    ]
  }
];

function listAgents() {
  return [
    { ...chiefExecutive },
    ...departments.flatMap((department) => [
      { ...department.head, departmentId: department.id, departmentName: department.name },
      ...department.specialists.map((agent) => ({
        ...agent,
        departmentId: department.id,
        departmentName: department.name
      }))
    ])
  ];
}

function getOrganization() {
  return {
    name: "ULUGBEK AI Virtual Company",
    totalSeats: 100,
    chiefManagerCount: 1,
    departmentHeadCount: departments.length,
    specialistCount: departments.reduce((sum, item) => sum + item.specialists.length, 0),
    activationMode: "catalogue_only",
    departments: departments.map((item) => ({
      id: item.id,
      name: item.name,
      head: { ...item.head },
      specialists: item.specialists.map((agent) => ({ ...agent }))
    }))
  };
}

function validateOrganization() {
  const agents = listAgents();
  const ids = new Set(agents.map((agent) => agent.id));
  return {
    valid: agents.length === 100 && ids.size === 100 &&
      departments.length === 10 &&
      departments.every((item) => item.specialists.length > 0),
    total: agents.length,
    chiefManagers: agents.filter((agent) => agent.role === "chief_manager").length,
    departmentHeads: agents.filter((agent) => agent.role === "department_head").length,
    specialists: agents.filter((agent) => agent.role === "specialist").length,
    uniqueIds: ids.size
  };
}

module.exports = { chiefExecutive, departments, listAgents, getOrganization, validateOrganization };
