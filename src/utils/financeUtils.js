export const calculateMonthsRemaining = (endDateStr) => {
    if (!endDateStr) return 0;
    const now = new Date();
    const end = new Date(endDateStr);
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return Math.max(0, months);
};

export const calculatePrincipal = (monthlyPayment, annualRate, months) => {
    if (months <= 0) return 0;
    if (annualRate === 0) return monthlyPayment * months;

    const r = annualRate / 100 / 12;
    // PV = PMT * (1 - (1+r)^-n) / r
    return monthlyPayment * (1 - Math.pow(1 + r, -months)) / r;
};

export const generateAmortizationSchedule = (principal, annualRate, months, monthlyPayment) => {
    const schedule = [];
    let balance = principal;
    const r = annualRate / 100 / 12;

    for (let i = 1; i <= months; i++) {
        const interest = balance * r;
        const principalPayment = monthlyPayment - interest;
        balance -= principalPayment;

        if (balance < 0) balance = 0;

        schedule.push({
            month: i,
            payment: monthlyPayment,
            interest: interest,
            principal: principalPayment,
            balance: balance
        });
    }
    return schedule;
};
