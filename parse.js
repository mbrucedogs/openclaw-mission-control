const parser = require('cron-parser');
const interval = parser.parseExpression('0 7 * * 1-5');
console.log(interval.fields.dayOfWeek);
