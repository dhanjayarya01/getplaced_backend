
/**
 * Generate Python wrapper code using explicit Python metadata
 * @param {Object} problem - Problem object with pythonMetadata
 * @param {string} userCode - User's Python code
 * @returns {string} - Complete Python program
 */
export const generatePythonWrapper = (problem, userCode) => {
    // metadata is now in problem.pythonMetadata
    const metadata = problem.pythonMetadata || {};
    const fn = metadata.functionName;
    const params = metadata.parameters || [];
    const returnType = metadata.returnType || {};

    // If no specific metadata, check if we can fallback or just return user code
    // Ideally we should enforce metadata for auto-generation.
    if (!fn) {
        return userCode;
    }

    let parseCode = "";
    let callArgs = [];

    params.forEach((param) => {
        const { name, type } = param;

        if (type === 'int') {
            parseCode += `${name} = int(input().strip())\n`;
        }
        else if (type === 'float') {
            parseCode += `${name} = float(input().strip())\n`;
        }
        else if (type === 'str') {
            parseCode += `${name} = input().strip()\n`;
        }
        else if (type === 'bool') {
            // Python's bool(input()) is always True if string is not empty, so we might need better parsing
            // Assuming "true"/"false" strings or 0/1, or just standard eval for safety in CP context often eval is used or json.loads
            // For now let's stick to safe-ish eval or json
            parseCode += `${name} = input().strip().lower() == 'true'\n`;
        }
        else if (type === 'List[int]' || type === 'List[float]' || type === 'List[str]') {
            parseCode += `import json\n`;
            parseCode += `${name} = json.loads(input().strip())  # Expecting JSON array format e.g. [1, 2]\n`;
        }
        else {
            // Fallback to eval or string
            parseCode += `${name} = eval(input().strip()) # Fallback for ${type}\n`;
        }
        callArgs.push(name);
    });

    const callArgsStr = callArgs.join(', ');


    // Check for class method
    // Robust detection for class Solution
    const isClassMethod = /class\s+Solution/.test(userCode);
    let functionCall;

    if (isClassMethod) {
        functionCall = `sol = Solution()\n    result = sol.${fn}(${callArgsStr})`;
    } else {
        functionCall = `result = ${fn}(${callArgsStr})`;
    }

    let printCode = `print(result, flush=True)`;
    const rType = returnType.type;

    if (rType && (rType.startsWith('List') || rType === 'dict')) {
        // Print as JSON string for consistency, replace spaces to match standard CP outputs often
        printCode = `import json\n    print(json.dumps(result, separators=(',', ':')), flush=True)`;
    }

    return `${userCode}

if __name__ == "__main__":
    try:
${parseCode.trim().split('\n').map(line => '        ' + line).join('\n')}
        ${functionCall}
        ${printCode}
    except Exception as e:
        import sys
        # print(f"Error: {e}", file=sys.stderr)
        raise e
`;
};
