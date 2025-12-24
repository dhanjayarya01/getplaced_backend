import { generatePythonWrapper } from './wrappers/python.wrapper.js';
import { generateJavaWrapper } from './wrappers/java.wrapper.js';
import { generateCPPWrapper as generateCppWrapper } from './wrappers/cpp.wrapper.js';
import { generateJavaScriptWrapper } from './wrappers/javascript.wrapper.js';
import { generateCWrapper } from './wrappers/c.wrapper.js';

/**
 * Main wrapper function - requires problem metadata
 * @param {Object} problem - Problem object with functionName, parameters, returnType  
 * @param {string} code - User's code
 * @param {string} language - Programming language
 * @returns {string} - Wrapped code
 */
export const wrapCode = (problem, code, language) => {
  switch (language.toLowerCase()) {
    case 'c':
      return generateCWrapper(problem, code);
    case 'cpp':
    case 'c++':
      return generateCppWrapper(problem, code);
    case 'python':
    case 'python3':
      return generatePythonWrapper(problem, code);
    case 'java':
      return generateJavaWrapper(problem, code);
    case 'javascript':
    case 'js':
      return generateJavaScriptWrapper(problem, code);
    default:
      return code;
  }
};

export default {
  generateCWrapper,
  generateCppWrapper,
  generatePythonWrapper,
  generateJavaWrapper,
  generateJavaScriptWrapper,
  wrapCode
};
