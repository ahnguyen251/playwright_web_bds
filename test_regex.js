const body = 'Vui lòng nhập mã OTP bên dưới để hoàn tất xác thực:\n\n4 1 2 8 6 0\n\nMã có hiệu lực trong 3 phút';
const pattern = 'hoàn tất xác thực:{otp}';
const plainText = body.replace(/<[^>]+>/g, ' ');
const [prefix = '', suffix = ''] = pattern.split('{otp}');
const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const expression = new RegExp(
  `${escapeRegularExpression(prefix)}[\\s\\S]*?(?<![\\p{L}\\p{N}_])(?<otp>\\d(?:\\s*\\d){5})(?![\\p{L}\\p{N}_])[\\s\\S]*?${escapeRegularExpression(suffix)}`,
  'u'
);
const match = expression.exec(plainText);
console.log('Match:', match?.groups?.otp);
