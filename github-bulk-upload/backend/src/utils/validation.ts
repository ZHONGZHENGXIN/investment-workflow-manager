import Joi from 'joi';
import { 
  CreateWorkflowInput, 
  UpdateWorkflowInput,
  CreateWorkflowStepInput,
  UpdateWorkflowStepInput 
} from '../types/models';

// 验证结果接口
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

// 工作流验证Schema
const workflowSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': '工作流名称不能为空',
    'string.min': '工作流名称至少1个字符',
    'string.max': '工作流名称不能超过100个字符',
    'any.required': '工作流名称是必填项'
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': '工作流描述不能超过500个字符'
  }),
  category: Joi.string().max(50).optional().allow('').messages({
    'string.max': '分类名称不能超过50个字符'
  }),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional().messages({
    'array.max': '标签数量不能超过10个',
    'string.max': '单个标签不能超过30个字符'
  }),
  isTemplate: Joi.boolean().optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'ARCHIVED').optional(),
  metadata: Joi.object().optional(),
  steps: Joi.array().items(Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    order: Joi.number().integer().min(1).required(),
    isRequired: Joi.boolean().optional(),
    stepType: Joi.string().valid('CHECKLIST', 'INPUT', 'DECISION', 'APPROVAL', 'CALCULATION', 'NOTIFICATION').optional(),
    estimatedTime: Joi.number().integer().min(1).optional(),
    dependencies: Joi.array().items(Joi.string()).optional(),
    conditions: Joi.object().optional(),
    metadata: Joi.object().optional(),
  })).optional()
});

// 工作流更新验证Schema（所有字段都是可选的）
const workflowUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.empty': '工作流名称不能为空',
    'string.min': '工作流名称至少1个字符',
    'string.max': '工作流名称不能超过100个字符'
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': '工作流描述不能超过500个字符'
  }),
  category: Joi.string().max(50).optional().allow('').messages({
    'string.max': '分类名称不能超过50个字符'
  }),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional().messages({
    'array.max': '标签数量不能超过10个',
    'string.max': '单个标签不能超过30个字符'
  }),
  isActive: Joi.boolean().optional(),
  isTemplate: Joi.boolean().optional(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'ARCHIVED').optional(),
  metadata: Joi.object().optional(),
});

// 工作流步骤验证Schema
const workflowStepSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': '步骤名称不能为空',
    'string.min': '步骤名称至少1个字符',
    'string.max': '步骤名称不能超过100个字符',
    'any.required': '步骤名称是必填项'
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': '步骤描述不能超过500个字符'
  }),
  order: Joi.number().integer().min(1).required().messages({
    'number.base': '步骤顺序必须是数字',
    'number.integer': '步骤顺序必须是整数',
    'number.min': '步骤顺序必须大于0',
    'any.required': '步骤顺序是必填项'
  }),
  isRequired: Joi.boolean().optional(),
  stepType: Joi.string().valid('CHECKLIST', 'INPUT', 'DECISION', 'APPROVAL', 'CALCULATION', 'NOTIFICATION').optional(),
  estimatedTime: Joi.number().integer().min(1).optional().messages({
    'number.base': '预估时间必须是数字',
    'number.integer': '预估时间必须是整数',
    'number.min': '预估时间必须大于0'
  }),
  dependencies: Joi.array().items(Joi.string()).optional(),
  conditions: Joi.object().optional(),
  metadata: Joi.object().optional(),
});

// 工作流步骤更新验证Schema
const workflowStepUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.empty': '步骤名称不能为空',
    'string.min': '步骤名称至少1个字符',
    'string.max': '步骤名称不能超过100个字符'
  }),
  description: Joi.string().max(500).optional().allow('').messages({
    'string.max': '步骤描述不能超过500个字符'
  }),
  order: Joi.number().integer().min(1).optional().messages({
    'number.base': '步骤顺序必须是数字',
    'number.integer': '步骤顺序必须是整数',
    'number.min': '步骤顺序必须大于0'
  }),
  isRequired: Joi.boolean().optional(),
  stepType: Joi.string().valid('CHECKLIST', 'INPUT', 'DECISION', 'APPROVAL', 'CALCULATION', 'NOTIFICATION').optional(),
  estimatedTime: Joi.number().integer().min(1).optional().messages({
    'number.base': '预估时间必须是数字',
    'number.integer': '预估时间必须是整数',
    'number.min': '预估时间必须大于0'
  }),
  dependencies: Joi.array().items(Joi.string()).optional(),
  conditions: Joi.object().optional(),
  metadata: Joi.object().optional(),
});

// 验证工作流数据
export function validateWorkflow(data: any, isUpdate = false): ValidationResult<CreateWorkflowInput | UpdateWorkflowInput> {
  const schema = isUpdate ? workflowUpdateSchema : workflowSchema;
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
}

// 验证工作流步骤数据
export function validateWorkflowStep(data: any, isUpdate = false): ValidationResult<CreateWorkflowStepInput | UpdateWorkflowStepInput> {
  const schema = isUpdate ? workflowStepUpdateSchema : workflowStepSchema;
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
}

// 用户验证Schema
const userSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '邮箱格式不正确',
    'any.required': '邮箱是必填项'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': '密码至少6个字符',
    'string.max': '密码不能超过100个字符',
    'any.required': '密码是必填项'
  }),
  firstName: Joi.string().min(1).max(50).required().messages({
    'string.empty': '名字不能为空',
    'string.max': '名字不能超过50个字符',
    'any.required': '名字是必填项'
  }),
  lastName: Joi.string().min(1).max(50).required().messages({
    'string.empty': '姓氏不能为空',
    'string.max': '姓氏不能超过50个字符',
    'any.required': '姓氏是必填项'
  }),
  avatar: Joi.string().uri().optional(),
  role: Joi.string().valid('USER', 'ADMIN', 'SUPER_ADMIN').optional()
});

// 用户更新验证Schema
const userUpdateSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    'string.email': '邮箱格式不正确'
  }),
  firstName: Joi.string().min(1).max(50).optional().messages({
    'string.empty': '名字不能为空',
    'string.max': '名字不能超过50个字符'
  }),
  lastName: Joi.string().min(1).max(50).optional().messages({
    'string.empty': '姓氏不能为空',
    'string.max': '姓氏不能超过50个字符'
  }),
  avatar: Joi.string().uri().optional(),
  role: Joi.string().valid('USER', 'ADMIN', 'SUPER_ADMIN').optional(),
  isActive: Joi.boolean().optional()
});

// 登录验证Schema
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '邮箱格式不正确',
    'any.required': '邮箱是必填项'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码是必填项'
  })
});

// 验证用户数据
export function validateUser(data: any, isUpdate = false): ValidationResult<any> {
  const schema = isUpdate ? userUpdateSchema : userSchema;
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
}

// 验证登录数据
export function validateLogin(data: any): ValidationResult<any> {
  const { error, value } = loginSchema.validate(data, { abortEarly: false });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
}

// 执行记录验证Schema
const executionSchema = Joi.object({
  workflowId: Joi.string().required().messages({
    'any.required': '工作流ID是必填项'
  }),
  title: Joi.string().max(200).optional().messages({
    'string.max': '标题不能超过200个字符'
  }),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  dueDate: Joi.date().optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  metadata: Joi.object().optional()
});

// 执行记录更新验证Schema
const executionUpdateSchema = Joi.object({
  title: Joi.string().max(200).optional().messages({
    'string.max': '标题不能超过200个字符'
  }),
  status: Joi.string().valid('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED', 'FAILED').optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  dueDate: Joi.date().optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  metadata: Joi.object().optional()
});

// 验证执行记录数据
export function validateExecution(data: any, isUpdate = false): ValidationResult<any> {
  const schema = isUpdate ? executionUpdateSchema : executionSchema;
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
}

// 通用验证函数
export function validate<T>(schema: Joi.ObjectSchema, data: any): T {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    throw new Error(error.details.map(detail => detail.message).join(', '));
  }
  
  return value;
}

export default {
  validateWorkflow,
  validateWorkflowStep,
  validateUser,
  validateLogin,
  validateExecution,
  validate
};