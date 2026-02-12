'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Building2, Users, ChevronDown, ChevronRight, MapPin, User, Briefcase, UserCog, X } from '@/components/ui/icons';
import { toast } from 'sonner';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  app_role: string;
  site_id?: string;
  site_name?: string;
  department?: string;
}

interface ExecutiveTeam {
  ceo?: Employee[];
  md?: Employee[];
  coo?: Employee[];
  cfo?: Employee[];
  hr_manager?: Employee[];
  operations_manager?: Employee[];
  finance_manager?: Employee[];
  regional_manager?: Employee[];
  area_manager?: Employee[];
}

interface Region {
  id: string;
  name: string;
  manager_id?: string;
  manager_name?: string;
  areas: Area[];
}

interface Area {
  id: string;
  name: string;
  region_id: string;
  manager_id?: string;
  manager_name?: string;
  sites: Site[];
}

interface Site {
  id: string;
  name: string;
  area_id?: string;
  company_id: string;
  manager_id?: string;
  manager_name?: string;
  employee_count: number;
  employees: Employee[];
}

export default function OrgChartPage() {
  const { profile } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<Region[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [executives, setExecutives] = useState<ExecutiveTeam>({});
  const [headOfficeStaff, setHeadOfficeStaff] = useState<Employee[]>([]);
  
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [assigningSiteId, setAssigningSiteId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const canManage = ['admin', 'owner', 'general_manager', 'area_manager', 'regional_manager'].includes(
    profile?.app_role?.toLowerCase() || ''
  );

  useEffect(() => {
    if (profile?.company_id) {
      loadOrgStructure();
    }
  }, [profile]);

  async function loadOrgStructure() {
    try {
      setLoading(true);

      // Fetch all employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, app_role, site_id')
        .eq('company_id', profile!.company_id)
        .order('full_name');

      if (employeesError) throw employeesError;

      // Fetch all sites to get site names
      const { data: sitesDataForNames, error: sitesNamesError } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', profile!.company_id);

      if (sitesNamesError) throw sitesNamesError;

      // Create a map of site IDs to names
      const siteNamesMap = new Map(
        (sitesDataForNames || []).map(site => [site.id, site.name])
      );

      // Map employees with site names
      const employees: Employee[] = (allEmployees || []).map(emp => ({
        id: emp.id,
        full_name: emp.full_name,
        email: emp.email,
        app_role: emp.app_role,
        site_id: emp.site_id,
        site_name: emp.site_id ? siteNamesMap.get(emp.site_id) : undefined,
      }));

      // Group executives by role
      const executiveRoles = {
        ceo: employees.filter(e => e.app_role === 'Owner' || e.app_role === 'CEO'),
        md: employees.filter(e => e.app_role === 'Managing Director' || e.app_role === 'MD'),
        coo: employees.filter(e => e.app_role === 'COO'),
        cfo: employees.filter(e => e.app_role === 'CFO'),
        hr_manager: employees.filter(e => e.app_role === 'HR Manager'),
        operations_manager: employees.filter(e => e.app_role === 'Operations Manager'),
        finance_manager: employees.filter(e => e.app_role === 'Finance Manager'),
        regional_manager: employees.filter(e => e.app_role === 'Regional Manager'),
        area_manager: employees.filter(e => e.app_role === 'Area Manager'),
      };

      setExecutives(executiveRoles);

      // Head office staff (no site assigned, excluding executives)
      const headOffice = employees.filter(e => 
        !e.site_id && 
        !['Owner', 'CEO', 'Managing Director', 'MD', 'COO', 'CFO', 'HR Manager', 
          'Operations Manager', 'Finance Manager', 'Regional Manager', 'Area Manager', 'Admin'].includes(e.app_role)
      );
      setHeadOfficeStaff(headOffice);

      // Fetch regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, regional_manager_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (regionsError) throw regionsError;

      // Fetch areas
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('id, name, region_id, area_manager_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (areasError) throw areasError;

      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, area_id, company_id')
        .eq('company_id', profile!.company_id)
        .order('name');

      if (sitesError) throw sitesError;

      // Create managers map
      const managersMap = new Map(
        employees.map(e => [e.id, e.full_name])
      );

      // Build the hierarchy with employees
      const regionsWithAreas: Region[] = (regionsData || []).map(region => {
        const regionAreas = (areasData || []).filter(area => area.region_id === region.id);
        
        return {
          id: region.id,
          name: region.name,
          manager_id: region.regional_manager_id,
          manager_name: region.regional_manager_id ? managersMap.get(region.regional_manager_id) : undefined,
          areas: regionAreas.map(area => {
            const areaSites = (sitesData || []).filter(site => site.area_id === area.id);
            
            return {
              id: area.id,
              name: area.name,
              region_id: area.region_id,
              manager_id: area.area_manager_id,
              manager_name: area.area_manager_id ? managersMap.get(area.area_manager_id) : undefined,
              sites: areaSites.map(site => {
                const siteEmployees = employees.filter(e => e.site_id === site.id);
                const siteManager = siteEmployees.find(e => e.app_role === 'Manager');
                
                return {
                  id: site.id,
                  name: site.name,
                  area_id: site.area_id,
                  company_id: site.company_id,
                  manager_id: siteManager?.id,
                  manager_name: siteManager?.full_name,
                  employee_count: siteEmployees.length,
                  employees: siteEmployees,
                };
              }),
            };
          }),
        };
      });

      // Get unassigned sites (no area)
      const unassignedSites = (sitesData || [])
        .filter(site => !site.area_id)
        .map(site => {
          const siteEmployees = employees.filter(e => e.site_id === site.id);
          const siteManager = siteEmployees.find(e => e.app_role === 'Manager');
          
          return {
            id: site.id,
            name: site.name,
            area_id: site.area_id,
            company_id: site.company_id,
            manager_id: siteManager?.id,
            manager_name: siteManager?.full_name,
            employee_count: siteEmployees.length,
            employees: siteEmployees,
          };
        });

      setRegions(regionsWithAreas);
      setSites(unassignedSites);
    } catch (error: any) {
      console.error('Error loading org structure:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      let errorMessage = 'Failed to load organizational structure';
      
      if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      } else if (error?.code) {
        errorMessage = `Database error (${error.code})`;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function toggleRegion(regionId: string) {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }

  function toggleArea(areaId: string) {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }

  function toggleSite(siteId: string) {
    setExpandedSites(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }

  function toggleDepartment(dept: string) {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  }

  async function handleAssignSite(siteId: string, areaId: string) {
    if (!areaId) return;
    setAssigning(true);
    try {
      const { error } = await supabase
        .from('sites')
        .update({ area_id: areaId })
        .eq('id', siteId);

      if (error) throw error;
      toast.success('Site assigned to area successfully');
      setAssigningSiteId(null);
      loadOrgStructure();
    } catch (error) {
      console.error('Error assigning site:', error);
      toast.error('Failed to assign site');
    } finally {
      setAssigning(false);
    }
  }

  function renderEmployee(employee: Employee, level: number = 0) {
    const marginLeft = level * 16;
    return (
      <div
        key={employee.id}
        className="flex items-center gap-3 p-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors"
        style={{ marginLeft: `${marginLeft}px` }}
      >
        <User className="w-4 h-4 text-theme-tertiary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-theme-primary truncate">{employee.full_name}</p>
          <p className="text-xs text-theme-tertiary truncate">{employee.app_role}</p>
        </div>
        <span className="text-xs text-theme-secondary truncate">{employee.email}</span>
      </div>
    );
  }

  function renderExecutiveSection(title: string, icon: React.ReactNode, employees?: Employee[]) {
    if (!employees || employees.length === 0) return null;

    const sectionKey = title.toLowerCase().replace(/\s+/g, '_');
    const isExpanded = expandedDepartments.has(sectionKey);

    return (
      <div className="mb-4">
        <button
          onClick={() => toggleDepartment(sectionKey)}
          className="flex items-center gap-3 w-full p-3 bg-module-fg/[0.05] border border-module-fg/15 rounded-lg hover:border-module-fg/30 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-module-fg flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-module-fg flex-shrink-0" />
          )}
          {icon}
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-theme-primary">{title}</h3>
            <p className="text-xs text-theme-secondary">{employees.length} person(s)</p>
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-2 ml-8 space-y-1">
            {employees.map(emp => renderEmployee(emp))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-module-fg mx-auto mb-4"></div>
          <p className="text-theme-secondary">Loading organizational structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-primary mb-2">Organizational Chart</h1>
        <p className="text-theme-secondary">
          Complete view of your company's hierarchical structure
        </p>
      </div>

      {/* Company Level */}
      <div className="bg-theme-surface border border-theme rounded-lg p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-module-fg" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-theme-primary">
              {profile?.companies?.name || 'Company'}
            </h2>
            <p className="text-sm text-theme-secondary">Complete Organizational Structure</p>
          </div>
        </div>

        {/* Executive Team */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-module-fg" />
            Executive Leadership
          </h3>
          <div className="space-y-2">
            {renderExecutiveSection('CEO / Owner', <User className="w-5 h-5 text-module-fg" />, executives.ceo)}
            {renderExecutiveSection('Managing Director', <User className="w-5 h-5 text-module-fg" />, executives.md)}
            {renderExecutiveSection('Chief Operating Officer (COO)', <UserCog className="w-5 h-5 text-module-fg" />, executives.coo)}
            {renderExecutiveSection('Chief Financial Officer (CFO)', <UserCog className="w-5 h-5 text-module-fg" />, executives.cfo)}
            {renderExecutiveSection('HR Manager', <Users className="w-5 h-5 text-module-fg" />, executives.hr_manager)}
            {renderExecutiveSection('Operations Manager', <Briefcase className="w-5 h-5 text-module-fg" />, executives.operations_manager)}
            {renderExecutiveSection('Finance Manager', <Briefcase className="w-5 h-5 text-module-fg" />, executives.finance_manager)}
          </div>
        </div>

        {/* Regional Managers */}
        {executives.regional_manager && executives.regional_manager.length > 0 && (
          <div className="mb-6">
            {renderExecutiveSection('Regional Managers', <MapPin className="w-5 h-5 text-module-fg" />, executives.regional_manager)}
          </div>
        )}

        {/* Area Managers */}
        {executives.area_manager && executives.area_manager.length > 0 && (
          <div className="mb-6">
            {renderExecutiveSection('Area Managers', <Building2 className="w-5 h-5 text-module-fg" />, executives.area_manager)}
          </div>
        )}

        {/* Head Office Staff */}
        {headOfficeStaff.length > 0 && (
          <div className="mb-6">
            {renderExecutiveSection('Head Office Staff', <Building2 className="w-5 h-5 text-theme-tertiary" />, headOfficeStaff)}
          </div>
        )}

        {/* Regions & Sites */}
        {regions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-module-fg" />
              Regional Structure
            </h3>
            <div className="space-y-4">
              {regions.map((region) => (
                <div key={region.id} className="ml-4">
                  {/* Region */}
                  <div className="bg-module-fg/[0.04] border border-module-fg/15 rounded-lg p-4">
                    <button
                      onClick={() => toggleRegion(region.id)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      {expandedRegions.has(region.id) ? (
                        <ChevronDown className="w-5 h-5 text-module-fg flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-module-fg flex-shrink-0" />
                      )}
                      <MapPin className="w-5 h-5 text-module-fg flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-theme-primary">{region.name}</h3>
                        {region.manager_name && (
                          <p className="text-sm text-theme-secondary">
                            Regional Manager: {region.manager_name}
                          </p>
                        )}
                        <p className="text-xs text-theme-secondary">
                          {region.areas.length} area(s) • {region.areas.reduce((acc, a) => acc + a.sites.reduce((sum, s) => sum + s.employee_count, 0), 0)} employees
                        </p>
                      </div>
                    </button>

                    {/* Areas */}
                    {expandedRegions.has(region.id) && region.areas.length > 0 && (
                      <div className="ml-8 mt-4 space-y-3">
                        {region.areas.map((area) => (
                          <div key={area.id} className="bg-module-fg/[0.05] border border-module-fg/15 rounded-lg p-3">
                            <button
                              onClick={() => toggleArea(area.id)}
                              className="w-full flex items-center gap-3 text-left"
                            >
                              {expandedAreas.has(area.id) ? (
                                <ChevronDown className="w-4 h-4 text-module-fg flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-module-fg flex-shrink-0" />
                              )}
                              <Building2 className="w-4 h-4 text-module-fg flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-theme-primary">{area.name}</h4>
                                {area.manager_name && (
                                  <p className="text-xs text-theme-secondary">
                                    Area Manager: {area.manager_name}
                                  </p>
                                )}
                                <p className="text-xs text-theme-secondary">
                                  {area.sites.length} site(s) • {area.sites.reduce((sum, s) => sum + s.employee_count, 0)} employees
                                </p>
                              </div>
                            </button>

                            {/* Sites */}
                            {expandedAreas.has(area.id) && area.sites.length > 0 && (
                              <div className="ml-6 mt-3 space-y-2">
                                {area.sites.map((site) => (
                                  <div key={site.id} className="bg-module-fg/[0.03] border border-module-fg/10 rounded-lg p-3">
                                    <button
                                      onClick={() => toggleSite(site.id)}
                                      className="w-full flex items-center gap-3 text-left"
                                    >
                                      {expandedSites.has(site.id) ? (
                                        <ChevronDown className="w-4 h-4 text-module-fg flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-module-fg flex-shrink-0" />
                                      )}
                                      <Building2 className="w-4 h-4 text-module-fg flex-shrink-0" />
                                      <div className="flex-1">
                                        <h5 className="text-sm font-medium text-theme-primary">{site.name}</h5>
                                        {site.manager_name && (
                                          <p className="text-xs text-theme-secondary">
                                            Site Manager: {site.manager_name}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-1 mt-1">
                                          <Users className="w-3 h-3 text-theme-tertiary" />
                                          <span className="text-xs text-theme-secondary">
                                            {site.employee_count} employee(s)
                                          </span>
                                        </div>
                                      </div>
                                    </button>

                                    {/* Employees at site */}
                                    {expandedSites.has(site.id) && site.employees.length > 0 && (
                                      <div className="ml-6 mt-2 space-y-1">
                                        {site.employees.map(emp => renderEmployee(emp))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Sites */}
        {sites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-theme-secondary mb-3">
              Sites Not Assigned to Areas
            </h3>
            <div className="ml-4 space-y-2">
              {sites.map((site) => (
                <div key={site.id} className="bg-module-fg/[0.03] border border-module-fg/10 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSite(site.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {expandedSites.has(site.id) ? (
                        <ChevronDown className="w-4 h-4 text-module-fg flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-module-fg flex-shrink-0" />
                      )}
                      <Building2 className="w-4 h-4 text-module-fg flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-theme-primary">{site.name}</h5>
                        {site.manager_name && (
                          <p className="text-xs text-theme-secondary">
                            Manager: {site.manager_name}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 text-theme-tertiary" />
                          <span className="text-xs text-theme-secondary">
                            {site.employee_count} employee(s)
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Assign button */}
                    {canManage && regions.length > 0 && assigningSiteId !== site.id && (
                      <button
                        onClick={() => setAssigningSiteId(site.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-module-fg bg-module-fg/10 rounded-lg hover:bg-module-fg/20 transition-colors flex-shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Assign
                      </button>
                    )}
                  </div>

                  {/* Inline area assignment dropdown */}
                  {assigningSiteId === site.id && (
                    <div className="ml-11 mt-2 flex items-center gap-2">
                      <select
                        autoFocus
                        disabled={assigning}
                        defaultValue=""
                        onChange={(e) => handleAssignSite(site.id, e.target.value)}
                        className="pl-3 pr-10 py-1.5 text-sm bg-theme-surface border border-module-fg/20 rounded-lg text-theme-primary focus:border-module-fg focus:ring-1 focus:ring-module-fg"
                      >
                        <option value="" disabled>Select area...</option>
                        {regions.map((region) => (
                          <optgroup key={region.id} label={region.name}>
                            {region.areas.map((area) => (
                              <option key={area.id} value={area.id}>
                                {area.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <button
                        onClick={() => setAssigningSiteId(null)}
                        className="p-1.5 text-theme-tertiary hover:text-theme-primary rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Employees at site */}
                  {expandedSites.has(site.id) && site.employees.length > 0 && (
                    <div className="ml-6 mt-2 space-y-1">
                      {site.employees.map(emp => renderEmployee(emp))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
