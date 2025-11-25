/**
 * Navigation configuration for the header system
 * Defines menu structure and routing paths
 */

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

// Left sidebar menu items based on active tab
export const SIDEBAR_MENUS = {
  editTasks: [
    { id: "my-tasks", label: "My Tasks", path: "/dashboard/tasks/my-tasks" },
    { id: "templates", label: "Templates", path: "/dashboard/tasks/templates" },
    {
      id: "compliance",
      label: "Compliance Tasks",
      path: "/dashboard/tasks/compliance",
    },
  ],
  todayChecks: [
    {
      id: "still-to-do",
      label: "Still to Do",
      path: "/dashboard/tasks/scheduled",
    },
    { id: "done", label: "Done", path: "/dashboard/tasks/completed" },
    { id: "add", label: "Add", path: "/dashboard/tasks/settings" },
  ],
};

// Burger menu sections
export const BURGER_MENU_SECTIONS: MenuSection[] = [
  {
    id: "account",
    label: "ACCOUNT",
    items: [
      { id: "profile", label: "My Profile", path: "/dashboard/settings" },
      { id: "password", label: "Change Password", path: "/dashboard/settings" },
      { id: "billing", label: "Billing & Plans", path: "/dashboard/settings" },
      { id: "signout", label: "Sign Out", path: "/" },
    ],
  },
  {
    id: "main-navigation",
    label: "MAIN NAVIGATION",
    items: [
      { id: "dashboard", label: "Dashboard", path: "/dashboard" },
      {
        id: "organization",
        label: "Organization",
        path: "/dashboard/organization",
      },
      { id: "sops", label: "SOPs", path: "/dashboard/sops" },
      { id: "tasks", label: "Tasks", path: "/dashboard/tasks" },
      { id: "assets", label: "Assets", path: "/dashboard/assets" },
      {
        id: "eho-readiness",
        label: "EHO Readiness",
        path: "/dashboard/compliance/eho",
      },
      { id: "reports", label: "Reports", path: "/dashboard/reports" },
      { id: "settings", label: "Settings", path: "/dashboard/settings" },
    ],
  },
  {
    id: "checkly-tasks",
    label: "CHECKLY TASKS",
    items: [
      { id: "my-tasks", label: "My Tasks", path: "/dashboard/tasks/my-tasks" },
      { id: "todo", label: "To-Do", path: "/dashboard/tasks/todo" },
      {
        id: "templates",
        label: "Templates",
        path: "/dashboard/tasks/templates",
      },
      {
        id: "compliance",
        label: "Compliance Tasks",
        path: "/dashboard/tasks/compliance",
      },
      {
        id: "todays-checks",
        label: "Today's Checks",
        path: "/dashboard/tasks/scheduled",
      },
      {
        id: "compliance-reports",
        label: "Compliance Reports",
        path: "/dashboard/reports",
      },
      {
        id: "incidents",
        label: "Incidents & Accidents",
        path: "/dashboard/incidents",
      },
      {
        id: "food-poisoning",
        label: "Food Poisoning",
        path: "/dashboard/incidents/food-poisoning",
      },
      {
        id: "contractor",
        label: "Contractor Callouts",
        path: "/dashboard/organization",
      },
    ],
  },
  {
    id: "company-settings",
    label: "COMPANY SETTINGS",
    items: [
      { id: "sites", label: "Sites", path: "/dashboard/organization" },
      {
        id: "users",
        label: "Users & Permissions",
        path: "/dashboard/organization",
      },
      {
        id: "business-hours",
        label: "Business Hours",
        path: "/dashboard/organization",
      },
      {
        id: "integrations",
        label: "Integrations",
        path: "/dashboard/organization",
      },
    ],
  },
];

// Role-based menu filtering
export const getMenuItemsByRole = (
  role: "admin" | "manager" | "team",
): MenuSection[] => {
  const allSections = [...BURGER_MENU_SECTIONS];

  if (role === "admin") {
    return allSections;
  }

  if (role === "manager") {
    return allSections.map((section) => {
      if (section.id === "main-navigation") {
        return {
          ...section,
          items: section.items.filter((item) =>
            [
              "dashboard",
              "organization",
              "sops",
              "tasks",
              "assets",
              "eho-readiness",
              "reports",
            ].includes(item.id)
          ),
        };
      }
      if (section.id === "checkly-tasks") {
        return {
          ...section,
          items: section.items.filter((item) =>
            [
              "edit-tasks",
              "todays-checks",
              "compliance-reports",
              "incidents",
              "food-poisoning",
            ].includes(item.id)
          ),
        };
      }
      if (section.id === "company-settings") {
        return {
          ...section,
          items: section.items.filter((item) =>
            ["sites", "business-hours"].includes(item.id)
          ),
        };
      }
      return section;
    });
  }

  // Team role - minimal access
  return allSections.map((section) => {
    if (section.id === "main-navigation") {
      return {
        ...section,
        items: section.items.filter((item) =>
          ["dashboard", "tasks", "eho-readiness"].includes(item.id)
        ),
      };
    }
    if (section.id === "checkly-tasks") {
      return {
        ...section,
        items: section.items.filter((item) =>
          ["todays-checks", "incidents", "food-poisoning"].includes(item.id)
        ),
      };
    }
    if (section.id === "company-settings") {
      return {
        ...section,
        items: [], // No company settings for team
      };
    }
    return section;
  }).filter((section) => section.items.length > 0);
};

// Tab types
export type ActiveTab = "edit-tasks" | "today-checks";

// Color palette
export const COLORS = {
  background: {
    dark: "#09090B",
    light: "#141419",
    hover: "#1A1A20",
  },
  border: "#2A2A2F",
  text: {
    primary: "#FFFFFF",
    secondary: "#A3A3A3",
    tertiary: "#717171",
  },
  accent: "#FF006E",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#FF4040",
};
