import { toast } from "sonner";

export interface ValidationRule {
  field: string;
  value: any;
  required?: boolean;
  isEmail?: boolean;
  isPhone?: boolean;
  isNumeric?: boolean;
  min?: number;
  label: string;
}

export function validateForm(rules: ValidationRule[]): boolean {
  for (const rule of rules) {
    const val = typeof rule.value === "string" ? rule.value.trim() : rule.value;

    if (rule.required && (val === undefined || val === null || val === "")) {
      toast.error(`${rule.label} is required.`);
      return false;
    }

    if (val) {
      if (rule.isEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          toast.error(`Please enter a valid email address for ${rule.label}.`);
          return false;
        }
      }

      if (rule.isPhone) {
        const phoneClean = String(val).replace(/[\s\-\(\)\+]/g, "");
        if (phoneClean.length < 7 || phoneClean.length > 15 || !/^\d+$/.test(phoneClean)) {
          toast.error(`Please enter a valid phone number for ${rule.label}.`);
          return false;
        }
      }

      if (rule.isNumeric) {
        const num = Number(val);
        if (isNaN(num)) {
          toast.error(`${rule.label} must be a valid number.`);
          return false;
        }
        if (rule.min !== undefined && num < rule.min) {
          toast.error(`${rule.label} must be at least ${rule.min}.`);
          return false;
        }
      }
    }
  }
  return true;
}
