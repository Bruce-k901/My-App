/**
 * Utility function to format error objects for logging
 * Handles Supabase errors, standard Error objects, and unknown error types
 */
export function formatError(error: any): string {
  if (!error) {
    return 'Unknown error (null/undefined)';
  }

  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Try to extract error information
  const errorInfo: Record<string, any> = {
    message: error.message || error.msg || null,
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
    name: error.name || null,
  };

  // Try to get error as string
  try {
    const errorString = String(error);
    if (errorString !== '[object Object]') {
      errorInfo.string = errorString;
    }
  } catch (e) {
    // Ignore
  }

  // Try to serialize the error object
  try {
    errorInfo.serialized = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
  } catch (e) {
    errorInfo.serialized = 'Could not serialize error';
  }

  // Build error message
  const parts: string[] = [];
  
  if (errorInfo.message) {
    parts.push(`Message: ${errorInfo.message}`);
  }
  
  if (errorInfo.code) {
    parts.push(`Code: ${errorInfo.code}`);
  }
  
  if (errorInfo.details) {
    parts.push(`Details: ${errorInfo.details}`);
  }
  
  if (errorInfo.hint) {
    parts.push(`Hint: ${errorInfo.hint}`);
  }
  
  if (errorInfo.name && errorInfo.name !== 'Error') {
    parts.push(`Type: ${errorInfo.name}`);
  }

  // If we have no parts, try to get something useful
  if (parts.length === 0) {
    if (errorInfo.string && errorInfo.string !== '[object Object]') {
      return errorInfo.string;
    }
    
    // Try to get keys
    try {
      const keys = Object.keys(error);
      if (keys.length > 0) {
        return `Error object with keys: ${keys.join(', ')}`;
      }
    } catch (e) {
      // Ignore
    }
    
    return 'Unknown error (empty object)';
  }

  return parts.join(' | ');
}

/**
 * Logs an error with full details
 */
export function logError(context: string, error: any, additionalInfo?: Record<string, any>) {
  const formatted = formatError(error);
  const errorDetails: Record<string, any> = {
    context,
    error: formatted,
  };

  // Add additional info if provided
  if (additionalInfo) {
    Object.assign(errorDetails, additionalInfo);
  }

  // Try to extract more details from the error
  if (error && typeof error === 'object') {
    try {
      const errorObj = error as any;
      if (errorObj.message) errorDetails.message = errorObj.message;
      if (errorObj.code) errorDetails.code = errorObj.code;
      if (errorObj.details) errorDetails.details = errorObj.details;
      if (errorObj.hint) errorDetails.hint = errorObj.hint;
      if (errorObj.stack) errorDetails.stack = errorObj.stack;
    } catch (e) {
      // Ignore
    }
  }

  console.error(`❌ ${context}:`, errorDetails);
  
  // Also log the full error object if it's serializable
  try {
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  } catch (e) {
    console.error('Could not serialize error object');
  }
}

