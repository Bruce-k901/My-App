'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Briefcase, 
  Shield, 
  CreditCard,
  Calendar,
  Save,
  Loader2,
  Plus,
  Trash2
} from '@/components/ui/icons';
import type { EmergencyContact } from '@/types/teamly';

export default function AddEmployeePage() {
  const { profile, company } = useAppContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('personal');
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    // Personal
    full_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    
    // Employment
    employee_number: '',
    position_title: '',
    department: '',
    app_role: 'Staff' as 'Staff' | 'Manager' | 'Admin' | 'Owner' | 'General_Manager',
    home_site: '',
    reports_to: '',
    start_date: '',
    probation_end_date: '',
    contract_type: 'permanent',
    contracted_hours: '',
    hourly_rate: '',
    salary: '',
    pay_frequency: 'monthly',
    notice_period_weeks: '1',
    boh_foh: 'FOH',
    
    // Compliance
    national_insurance_number: '',
    right_to_work_status: 'pending',
    right_to_work_expiry: '',
    right_to_work_document_type: '',
    dbs_status: 'not_required',
    dbs_certificate_number: '',
    dbs_check_date: '',
    
    // Banking
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_sort_code: '',
    
    // Leave
    annual_leave_allowance: '28',
  });
  
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { name: '', relationship: '', phone: '', email: '' }
  ]);

  const generateNextEmployeeNumber = async (): Promise<string | null> => {
    if (!profile?.company_id || !company?.name) return null;
    
    try {
      // Get first 3 letters of company name (uppercase, remove spaces/special chars)
      const companyPrefix = company.name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
      
      if (!companyPrefix || companyPrefix.length < 3) {
        console.warn('Company name too short for prefix');
        return null;
      }
      
      const prefix = `${companyPrefix}EMP`;
      
      // Get all existing employee numbers with this prefix
      const { data: existingEmployees, error } = await supabase
        .from('profiles')
        .select('employee_number')
        .eq('company_id', profile.company_id)
        .not('employee_number', 'is', null)
        .like('employee_number', `${prefix}%`);
      
      if (error) {
        console.error('Error fetching existing employee numbers:', error);
        return null;
      }
      
      // Extract numbers and find the highest
      let maxNumber = 0;
      if (existingEmployees && existingEmployees.length > 0) {
        existingEmployees.forEach((emp: any) => {
          const match = emp.employee_number?.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNumber) maxNumber = num;
          }
        });
      }
      
      // Generate next number (padded to 3 digits)
      const nextNumber = maxNumber + 1;
      const nextEmployeeNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      
      return nextEmployeeNumber;
    } catch (err) {
      console.error('Error generating employee number:', err);
      return null;
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchSites();
      fetchManagers();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id && company?.name && !formData.employee_number) {
      generateNextEmployeeNumber().then((generated) => {
        if (generated) {
          setFormData(prev => ({ ...prev, employee_number: generated }));
        }
      });
    }
  }, [profile?.company_id, company?.name]);

  useEffect(() => {
    if (profile?.company_id) {
      fetchSites();
      fetchManagers();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (profile?.company_id && company?.name && !formData.employee_number) {
      generateNextEmployeeNumber().then((generated) => {
        if (generated) {
          setFormData(prev => ({ ...prev, employee_number: generated }));
        }
      });
    }
  }, [profile?.company_id, company?.name]);

  const fetchSites = async () => {
    const { data } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', profile?.company_id)
      .order('name');
    setSites(data || []);
  };

  const fetchManagers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', profile?.company_id)
      .in('app_role', ['Manager', 'Admin', 'Owner'])
      .order('full_name');
    setManagers(data || []);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmergencyContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    setEmergencyContacts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEmergencyContact = () => {
    setEmergencyContacts(prev => [...prev, { name: '', relationship: '', phone: '', email: '' }]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.full_name || !formData.email) {
        throw new Error('Name and email are required');
      }

      // Check if email already exists before attempting insert
      if (formData.email) {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', formData.email.toLowerCase().trim())
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking for existing email:', checkError);
        }
        
        if (existingProfile) {
          throw new Error(`An employee with the email "${formData.email}" already exists. Please use a different email address or update the existing employee profile.`);
        }
      }

      // Filter out empty emergency contacts
      const validEmergencyContacts = emergencyContacts.filter(c => c.name && c.phone);

      // Prepare data for insert
      const insertData = {
        company_id: profile?.company_id,
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        nationality: formData.nationality || null,
        address_line_1: formData.address_line_1 || null,
        address_line_2: formData.address_line_2 || null,
        city: formData.city || null,
        county: formData.county || null,
        postcode: formData.postcode || null,
        country: formData.country,
        emergency_contacts: validEmergencyContacts.length > 0 ? validEmergencyContacts : null,
        
        employee_number: employeeNumber || null,
        position_title: formData.position_title || null,
        department: formData.department || null,
        app_role: formData.app_role,
        site_id: formData.home_site || null,  // Primary field for org chart
        home_site: formData.home_site || null, // Keep both in sync
        reports_to: formData.reports_to || null,
        start_date: formData.start_date || null,
        probation_end_date: formData.probation_end_date || null,
        contract_type: formData.contract_type,
        contracted_hours_per_week: formData.contracted_hours ? parseFloat(formData.contracted_hours) : null,
        hourly_rate: formData.hourly_rate ? Math.round(parseFloat(formData.hourly_rate) * 100) : null, // Convert to pence
        salary: formData.salary ? parseFloat(formData.salary) : null,
        pay_frequency: formData.pay_frequency,
        notice_period_weeks: formData.notice_period_weeks ? parseInt(formData.notice_period_weeks) : 1,
        boh_foh: formData.boh_foh,
        
        national_insurance_number: formData.national_insurance_number || null,
        right_to_work_status: formData.right_to_work_status,
        right_to_work_expiry: formData.right_to_work_expiry || null,
        right_to_work_document_type: formData.right_to_work_document_type || null,
        dbs_status: formData.dbs_status,
        dbs_certificate_number: formData.dbs_certificate_number || null,
        dbs_check_date: formData.dbs_check_date || null,
        
        bank_name: formData.bank_name || null,
        bank_account_name: formData.bank_account_name || null,
        bank_account_number: formData.bank_account_number || null,
        bank_sort_code: formData.bank_sort_code || null,
        
        annual_leave_allowance: formData.annual_leave_allowance ? parseFloat(formData.annual_leave_allowance) : 28,
        
        status: 'onboarding', // TODO: Provide UI to change to 'active' after onboarding complete
      };

      console.log('Inserting employee data:', { ...insertData, bank_account_number: '***' });
      
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          fullError: insertError
        });
        
        // Handle duplicate email error specifically
        if (insertError.code === '23505' && insertError.message?.includes('profiles_email_key')) {
          throw new Error(`An employee with the email "${formData.email}" already exists. Please use a different email address or update the existing employee profile.`);
        }
        
        throw new Error(insertError.message || `Failed to create employee: ${insertError.code || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data returned after insert');
      }

      console.log('Employee created successfully:', data.id);
      // Next step in the workflow: assign onboarding pack + track completion
      router.push(`/dashboard/people/onboarding?employeeId=${data.id}`);
      router.refresh();
    } catch (err: any) {
      console.error('Error creating employee:', {
        message: err?.message,
        error: err,
        stack: err?.stack,
        stringified: JSON.stringify(err, Object.getOwnPropertyNames(err))
      });
      setError(err?.message || err?.toString() || 'Failed to create employee. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'leave', label: 'Leave', icon: Calendar },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/people/employees"
          className="p-2 hover:bg-theme-button-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-theme-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Add Employee</h1>
          <p className="text-theme-secondary">Create a new team member profile</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-1 px-4 pt-3 mb-6 border-b border-theme">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-all relative
                ${activeSection === section.id
                  ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 dark:border-blue-500 shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-blue-50/50 dark:hover:bg-module-fg/10 hover:border-b-2 hover:border-blue-300 dark:hover:border-blue-500/30'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 dark:bg-red-500/10 border border-red-500/50 dark:border-red-500/50 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-theme-button backdrop-blur-sm border border-theme rounded-lg p-6">
          
          {/* Personal Section */}
          {activeSection === 'personal' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Nationality
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              
              {/* Address */}
              <div className="border-t border-theme pt-6 mt-6">
                <h3 className="text-md font-medium text-theme-primary mb-5">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="address_line_1"
                      value={formData.address_line_1}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="address_line_2"
                      value={formData.address_line_2}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      County
                    </label>
                    <input
                      type="text"
                      name="county"
                      value={formData.county}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              {/* Emergency Contacts */}
              <div className="border-t border-theme pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-theme-primary">Emergency Contacts</h3>
                  <button
                    type="button"
                    onClick={addEmergencyContact}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>
                
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5 p-5 bg-theme-button rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1.5">Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1.5">Relationship</label>
                      <input
                        type="text"
                        value={contact.relationship}
                        onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                        placeholder="e.g., Spouse, Parent"
                        className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-theme-secondary mb-1.5">Email</label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => handleEmergencyContactChange(index, 'email', e.target.value)}
                          className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                        />
                      </div>
                      {emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employment Section */}
          {activeSection === 'employment' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Briefcase className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Employment Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Employee Number
                  </label>
                  <input
                    type="text"
                    name="employee_number"
                    value={formData.employee_number}
                    onChange={handleChange}
                    placeholder="Auto-generated"
                    readOnly
                    className="w-full px-3 py-2 bg-theme-button border border-theme rounded-lg text-theme-tertiary cursor-not-allowed"
                    title="Employee number is auto-generated"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">Auto-generated based on company prefix</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Position / Job Title
                  </label>
                  <input
                    type="text"
                    name="position_title"
                    value={formData.position_title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    App Role
                  </label>
                  <select
                    name="app_role"
                    value={formData.app_role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Home Site
                  </label>
                  <select
                    name="home_site"
                    value={formData.home_site}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select site...</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Reports To
                  </label>
                  <select
                    name="reports_to"
                    value={formData.reports_to}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select manager...</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    BOH / FOH
                  </label>
                  <select
                    name="boh_foh"
                    value={formData.boh_foh}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="FOH">Front of House</option>
                    <option value="BOH">Back of House</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Probation End Date
                  </label>
                  <input
                    type="date"
                    name="probation_end_date"
                    value={formData.probation_end_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Contract Type
                  </label>
                  <select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="fixed_term">Fixed Term</option>
                    <option value="zero_hours">Zero Hours</option>
                    <option value="casual">Casual</option>
                    <option value="agency">Agency</option>
                    <option value="contractor">Contractor</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Contracted Hours (per week)
                  </label>
                  <input
                    type="number"
                    name="contracted_hours"
                    value={formData.contracted_hours}
                    onChange={handleChange}
                    step="0.5"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Hourly Rate (£)
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Annual Salary (£)
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    step="100"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Pay Frequency
                  </label>
                  <select
                    name="pay_frequency"
                    value={formData.pay_frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="four_weekly">Four Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Notice Period (weeks)
                  </label>
                  <input
                    type="number"
                    name="notice_period_weeks"
                    value={formData.notice_period_weeks}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Compliance Section */}
          {activeSection === 'compliance' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Compliance & Right to Work
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    National Insurance Number
                  </label>
                  <input
                    type="text"
                    name="national_insurance_number"
                    value={formData.national_insurance_number}
                    onChange={handleChange}
                    placeholder="e.g., AB123456C"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Right to Work Status
                  </label>
                  <select
                    name="right_to_work_status"
                    value={formData.right_to_work_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="expired">Expired</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    RTW Document Type
                  </label>
                  <select
                    name="right_to_work_document_type"
                    value={formData.right_to_work_document_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="passport">UK/EU Passport</option>
                    <option value="biometric_residence_permit">Biometric Residence Permit</option>
                    <option value="share_code">Share Code</option>
                    <option value="visa">Visa</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    RTW Expiry Date
                  </label>
                  <input
                    type="date"
                    name="right_to_work_expiry"
                    value={formData.right_to_work_expiry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-theme-secondary mt-1">Leave blank if no expiry (e.g., British citizen)</p>
                </div>
              </div>
              
              {/* DBS Section */}
              <div className="border-t border-theme pt-6 mt-6">
                <h3 className="text-md font-medium text-theme-primary mb-5">DBS Check</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      DBS Status
                    </label>
                    <select
                      name="dbs_status"
                      value={formData.dbs_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    >
                      <option value="not_required">Not Required</option>
                      <option value="pending">Pending</option>
                      <option value="clear">Clear</option>
                      <option value="issues_found">Issues Found</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      DBS Certificate Number
                    </label>
                    <input
                      type="text"
                      name="dbs_certificate_number"
                      value={formData.dbs_certificate_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                      DBS Check Date
                    </label>
                    <input
                      type="date"
                      name="dbs_check_date"
                      value={formData.dbs_check_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Banking Section */}
          {activeSection === 'banking' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <CreditCard className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Bank Details
              </h2>
              <p className="text-sm text-theme-secondary">
                Bank details are used for payroll export only and are stored securely.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="bank_account_name"
                    value={formData.bank_account_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Sort Code
                  </label>
                  <input
                    type="text"
                    name="bank_sort_code"
                    value={formData.bank_sort_code}
                    onChange={handleChange}
                    placeholder="XX-XX-XX"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    placeholder="8 digits"
                    maxLength={8}
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Leave Section */}
          {activeSection === 'leave' && (
            <div className="space-y-8">
              <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2 mb-5">
                <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Leave Allowance
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1.5">
                    Annual Leave Allowance (days)
                  </label>
                  <input
                    type="number"
                    name="annual_leave_allowance"
                    value={formData.annual_leave_allowance}
                    onChange={handleChange}
                    step="0.5"
                    className="w-full px-3 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 rounded-lg text-theme-primary focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-theme-secondary mt-1">UK statutory minimum is 28 days (including bank holidays)</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-theme">
            <Link
              href="/dashboard/people/employees"
              className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg border-0 shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-module-glow dark:hover:shadow-module-glow transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Create Employee
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

