import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER || 'test_user',
        pass: process.env.EMAIL_PASS || 'test_pass'
    }
});

export async function sendStatusEmail(email: string, status: string) {
    await transporter.sendMail({
        from: '"COMPANY Recruitment" <admin@company.co.in>',
        to: email,
        subject: 'Update on your COMPANY Application',
        text: `Your current application status is: ${status}`
    });
}