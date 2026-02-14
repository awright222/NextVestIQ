// ============================================
// PayrollBreakdown — Employee labor detail schedule
// ============================================
// Itemised employee roster: role, count, wage, hours,
// plus employer tax rates (FICA, FUTA, SUI, WC).
// Auto-calculates total annual labor cost.

'use client';

import { Plus, Trash2 } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import type { Employee, PayrollBreakdown as PayrollBreakdownType } from '@/types';

interface Props {
  data: PayrollBreakdownType;
  onChange: (data: PayrollBreakdownType) => void;
}

function defaultEmployee(): Employee {
  return {
    id: crypto.randomUUID(),
    title: '',
    count: 1,
    wageRate: 0,
    wageType: 'hourly',
    hoursPerWeek: 40,
    weeksPerYear: 52,
  };
}

export function calcPayrollTotal(data: PayrollBreakdownType): number {
  let totalWages = 0;

  for (const emp of data.employees) {
    const annualWage =
      emp.wageType === 'hourly'
        ? emp.wageRate * emp.hoursPerWeek * emp.weeksPerYear * emp.count
        : emp.wageRate * emp.count;
    totalWages += annualWage;
  }

  // Employer taxes applied to total wages
  const taxRate =
    (data.ficaRate + data.futaRate + data.suiRate + data.wcRate) / 100;

  return Math.round(totalWages * (1 + taxRate));
}

export function defaultPayrollBreakdown(): PayrollBreakdownType {
  return {
    employees: [],
    ficaRate: 7.65,
    futaRate: 0.6,
    suiRate: 2.7,
    wcRate: 1.5,
  };
}

export default function PayrollBreakdown({ data, onChange }: Props) {
  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    return isNaN(v) ? 0 : v;
  };

  const addEmployee = () => {
    onChange({
      ...data,
      employees: [...data.employees, defaultEmployee()],
    });
  };

  const removeEmployee = (id: string) => {
    onChange({
      ...data,
      employees: data.employees.filter((e) => e.id !== id),
    });
  };

  const updateEmployee = (id: string, field: keyof Employee, value: string | number) => {
    onChange({
      ...data,
      employees: data.employees.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });
  };

  const updateTax = (field: keyof Omit<PayrollBreakdownType, 'employees'>, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const total = calcPayrollTotal(data);

  return (
    <div className="space-y-5">
      {/* Employees */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-card-foreground">Employees</h4>
          <button
            type="button"
            onClick={addEmployee}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Role
          </button>
        </div>

        {data.employees.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No employees added. Click &quot;Add Role&quot; to build a payroll schedule.
          </p>
        )}

        <div className="space-y-4">
          {data.employees.map((emp, idx) => {
            const annualWage =
              emp.wageType === 'hourly'
                ? emp.wageRate * emp.hoursPerWeek * emp.weeksPerYear * emp.count
                : emp.wageRate * emp.count;

            return (
              <div
                key={emp.id}
                className="rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Role #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEmployee(emp.id)}
                    className="rounded p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <FormField
                    label="Title / Role"
                    value={emp.title}
                    onChange={(e) => updateEmployee(emp.id, 'title', e.target.value)}
                    placeholder="e.g. Barista"
                  />
                  <FormField
                    label="# Employees"
                    type="number"
                    value={emp.count || ''}
                    onChange={(e) => updateEmployee(emp.id, 'count', num(e))}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      Pay Type
                    </label>
                    <select
                      value={emp.wageType}
                      onChange={(e) =>
                        updateEmployee(emp.id, 'wageType', e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="salary">Salary</option>
                    </select>
                  </div>
                  <FormField
                    label={emp.wageType === 'hourly' ? 'Hourly Rate' : 'Annual Salary'}
                    prefix="$"
                    type="number"
                    step="0.25"
                    value={emp.wageRate || ''}
                    onChange={(e) => updateEmployee(emp.id, 'wageRate', num(e))}
                  />
                  {emp.wageType === 'hourly' && (
                    <>
                      <FormField
                        label="Hours / Week"
                        type="number"
                        value={emp.hoursPerWeek || ''}
                        onChange={(e) =>
                          updateEmployee(emp.id, 'hoursPerWeek', num(e))
                        }
                      />
                      <FormField
                        label="Weeks / Year"
                        type="number"
                        value={emp.weeksPerYear || ''}
                        onChange={(e) =>
                          updateEmployee(emp.id, 'weeksPerYear', num(e))
                        }
                      />
                    </>
                  )}
                </div>
                {annualWage > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    = ${annualWage.toLocaleString()}/yr total for this role
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Employer Tax Rates */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-card-foreground">
          Employer Tax Rates
        </h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Rates from your 941, 940, and state UI filings. Defaults are typical US rates.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FormField
            label="FICA (SS + Med)"
            suffix="%"
            type="number"
            step="0.01"
            value={data.ficaRate || ''}
            onChange={(e) => updateTax('ficaRate', num(e))}
            hint="Typically 7.65%"
          />
          <FormField
            label="FUTA"
            suffix="%"
            type="number"
            step="0.01"
            value={data.futaRate || ''}
            onChange={(e) => updateTax('futaRate', num(e))}
            hint="Typically 0.6%"
          />
          <FormField
            label="State UI (SUI)"
            suffix="%"
            type="number"
            step="0.01"
            value={data.suiRate || ''}
            onChange={(e) => updateTax('suiRate', num(e))}
            hint="Varies by state"
          />
          <FormField
            label="Workers' Comp"
            suffix="%"
            type="number"
            step="0.01"
            value={data.wcRate || ''}
            onChange={(e) => updateTax('wcRate', num(e))}
            hint="Varies by industry"
          />
        </div>
      </div>

      {/* Summary */}
      {data.employees.length > 0 && (
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="space-y-1 text-xs text-muted-foreground">
            {data.employees.map((emp) => {
              const wage =
                emp.wageType === 'hourly'
                  ? emp.wageRate * emp.hoursPerWeek * emp.weeksPerYear * emp.count
                  : emp.wageRate * emp.count;
              return (
                <div key={emp.id} className="flex justify-between">
                  <span>
                    {emp.title || 'Untitled'} ×{emp.count}
                  </span>
                  <span>${wage.toLocaleString()}</span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-border pt-1 font-medium text-card-foreground">
              <span>Total (incl. taxes)</span>
              <span>${total.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
