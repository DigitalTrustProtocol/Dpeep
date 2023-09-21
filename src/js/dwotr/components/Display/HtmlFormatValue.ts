export const formatValue = (value: any): string => {
    switch (typeof value) {
      case 'string':
        return value;
      case 'number':
        return value.toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'object':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        if (value === null) {
          return 'null';
        }
        if (Array.isArray(value)) {
          return 'Array[' + value.length + ']';
        }
        return 'Object';
      case 'undefined':
        return 'undefined';
      case 'function':
        return 'function';
      case 'symbol':
        return value.toString();
      case 'bigint':
        return value.toString() + 'n';
      default:
        return 'Unknown type';
    }
  };
  