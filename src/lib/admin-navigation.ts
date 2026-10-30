import { BarChart3, Brain, Building2, CircleHelp, Gift, LayoutDashboard, Megaphone, Settings, Users, UserPlus } from "lucide-react";

export const ADMIN_NAVIGATION = [
  {label:"Workspace",links:[{name:"Overview",href:"/admin",icon:LayoutDashboard},{name:"Analytics",href:"/admin/analytics",icon:BarChart3}]},
  {label:"People & content",links:[{name:"Player roster",href:"/admin/users",icon:Users},{name:"Departments",href:"/admin/departments",icon:Building2},{name:"Onboarding",href:"/admin/onboarding",icon:UserPlus},{name:"Announcements",href:"/admin/announcements",icon:Megaphone}]},
  {label:"Game operations",links:[{name:"Games",href:"/admin/games",icon:Brain},{name:"Questions",href:"/admin/questions",icon:CircleHelp},{name:"Prizes",href:"/admin/prizes",icon:Gift}]},
];
export const ADMIN_SETTINGS_LINK = {name:"Settings",href:"/admin/settings",icon:Settings};
