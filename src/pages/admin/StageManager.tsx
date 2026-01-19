import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

const STAGES = [
    { id: '01', name: 'Boxing Ring', code: 'STG-001-BOX', visits: '1,245', occupancy: '2/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2IuOdhYlmEycZPSnHiRALCGnjxIQoZ15zV4XSpvUrxmymeNLm_zbH3MKdQDSCIC3vBPbW80x1wrXlXeGBp1jv23sikokrsZDxGF1iI_-IbAKI8_7Gwt4x1UPMjo51PczKF72MCHQvE2Lva5Oh2xsjbZCbq_Q1iUSTmjCxzSq827k6cze7GmF8FWG5XJxSpcJu5Sc3ql5ADn5LLGNApDRPrXEGg2pK-M87v8ZW8CGUE0xRcxzsYk057kBYuDRmWBYnPDL6KB8ZV70' },
    { id: '02', name: 'Neon Alley', code: 'STG-002-NEO', visits: '892', occupancy: '5/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9Jml3KvgURgTePXlLGAB9b3H_X4sOYU6dc1bzZ7l_0l5_KjYSIA1yLk5bER27l9vXY-A7zwkQJrWWL_Lunpq8aWy5x_DDo0Thx7xU4kI_SBCVPxi8R8kP5JDvywT3WIKfDLfl8Lu2XQqwqP0YsV6fDXMPmzjwPRSUIEdo-PsIb1L-BR6dDUJHgkjo8FIlhZyzJ7tkqRrYon8ypZbLbSHLLAC9qkZd8W6gka-ry4PwBSm4TbFGKSldjjX86gUjalatl_q1PgbwD4I' },
    { id: '03', name: 'Vintage Library', code: 'STG-003-LIB', visits: '430', occupancy: '0/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5GxYKbI2q5980iM-8Zl4ggjCwFRpJCz05ZBWk5HldcvOIabV4F-BKQ_aU90HBUa098rDiQZQgY4GXsYUAUqLmAfVOIziGQ5FilJLcxl8pJYNJmby74DE8F0ULR0RI4KARvhcnbPtmAfE0PTzAlLsoUeebm7nuO2fYsVpR58uXoPeQuE_jBuuJAqPAcdkmbKbihibZ93_qeBxmNJtR-VF9plydanTgNpuFzRd-Ri4DOS0pi_9D0rA2MhxnXZKwFQOW6mvsysR3cIY' },
    { id: '04', name: 'Floral Garden', code: 'STG-004-FLR', visits: '1,502', occupancy: '3/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRGT_3SZ78WWLqF4k8wdvYS3s8cGEPrD3sQdgmHGm-A9eUFXzB0o5QNrNBQ_t2fRfWrl1QB8nFmi23dmNdXQEAvv-_knyEnSY1chgGUqVSHenQcEjyTLv-WJvTId0W3oNrKNckkcvEHkxpZrGmM79DOX_cKQjmtjaoyOEYACH15RaUse-tjAK-JRSq6AYW9ZbSFkyRaYs1rxMfWnca-BUjrEX5CMczNvQK7QhinOnEjSOeb2PWfi9plnuW8VtxuZXdOlsw2ZZLlKc' },
    { id: '05', name: 'Infinity White', code: 'STG-005-INF', visits: '670', occupancy: '1/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbaCPKloHyNsT_xp2b4ZErd0p-RTvKDxvcOJwO0crDR2lo5ANVXxXHU4pURX22HrF1V9fGCZYrvby2BpiE_j7nZDqixYose0YFv73d9p4Yk6cdiPqowdDZOOlHpD9JzJRh8lcku-_L_ijmhDrenZxfQBAKaXCfZYZZWnT2zkfUj_mzZAYpycjhRdstLoJGRZklJkPA6qSkNKrrG9e1eEZLAeOtkr-wGDQ42ggc8ZbAX1jrY4nb38Nzp6qIXfHlfEtIhF_ieSLDq4' },
    { id: '06', name: 'Retro Diner', code: 'STG-006-RET', visits: '2,100', occupancy: '4/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpBnJ3khFPb3Y1-jiRJL2zxuL3qMk--zCkgkjtCf15udL6fiPhgSbmSPeHT5_Kb_2L6Em91vONcCYc-3sUiSxufmk3KasJk5iB-zaywNYcWcJGsbILcMMkmL8UscuCgn-BXmFj0KfZ8zPuHsYX_hML3Q1uuroGrWCC5wjew41XHrFBDdMtdVBjxxq-1FVcFcZbbesStOUzVgGInTqiUIiyA0YnFKOHHY-V6SfuOJsltmDa91RpDkK5nTMVyzDGiAXTG8ZWSKPAxqE' },
    { id: '07', name: 'Industrial Loft', code: 'STG-007-IND', visits: '325', occupancy: '1/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2433yT0rjf088brKjbURlpxJLv8QLUYyyQVglRlmxCffdG8VpQzHjReiQZmw7bEOtWsKUFBJXfIq1R7S4IvQxC_FlsPcgezVU5YanwF3ozxvOxCpoVb_CJ2mO2TLmRErf5-B9OEb_J7-qvdTacMqSJNcN3gDIkE1SHu0RwGs1V1GuNzWxjQyMfMQ0gk2s5vGslspKHsLRmFxbyZga2_llPDMy9FDX0MGuJpUaMyaZEHJx-_pqsFSaOGrvE-1Bkfo2Ap0wPdxh5eU' },
    { id: '08', name: 'Space Station', code: 'STG-008-SPC', visits: '980', occupancy: '2/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7JY79CrW1--UxcPFlKS2sbV2C5m3tuwPKJZ8Cc3hlQktROA_jRdTLvIDSalHp6UC1lOVkwMHsZngDXWVaiKNDn2gqkGc_JRUv6Fp20ftcXQsnChe5GCyd5Mxq7QAtN258Mfzr5GC_sm0Ul2z3oF3vvQlgIrMj6Ruh_RYYP-wvkBIWPCoFWc086ZOQ1CFuRGNfBT-pqKrQ8uwf5Zzp6KHJGAYaCMZ_3A5vEP9URyMHSJEn08e6hr_UfIgDRsALQiEzUhsz9LEraQ4' },
    { id: '09', name: 'Subway Station', code: 'STG-009-SUB', visits: '412', occupancy: '0/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfxkksU_Tl-g9bA-40PtaCoOlVl1qCLsSF5oQOdKdWMEDm5JBsv6CQJWyGRBK1HAF_t_MjoygotgA1OfhY9KJXYDYdy5FyMBGi7Noe-yojBjR3sjyJdsj7hvFh7cYoaHOM36E3PuMybqF1cKa9CXyGAE7fSvbZHfdtXT47guKR03FwFwMZP29DgrfHfJ6LVLIO-HaYGn2Akgs1q7nwDFUvcku6lpX6UCIwC109eF_qPJu8JpioMGoR7dVF3VvXJXxBiq0dY7q0kB0' },
    { id: '10', name: 'Golden Hour', code: 'STG-010-GLD', visits: '1,890', occupancy: '3/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJBqtqPfLuYgSuwuFzCbzqF7E6QV9KJsDnRctbCYK7qhjsQn98F5v7HaTQAqgGgP1hZ6tCXCbtoRkbp0aFfKNkBxeGoqzYW4ZHk5xpxfunmAuvBolNIkak1kU-s26RVqGkh34-CTxtdvN5m0zWZl4svp2mKiDQQgQxRAHKfkHHzqC-dqA-xmV3IyythBCOybGHLbNVqsT1szJxbATo5bErVU_mwbitytHfOULNdyFJLrvNMgrRdeLRMQvvOcsqap9xedk41nzOtQI' },
    { id: '11', name: 'Abstract Room', code: 'STG-011-ABS', visits: '560', occupancy: '1/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSG3Vtmx98bnUk5buFVth4slYtxGOjByr2G0Q2bbSLv4KyTtW6y18c2zTNKHvW4O0BoiMOMjVWfU4glqWKS9f3jw1Aj3jJFWLwZ_F8fnCuz19uhIHTHV13nvboCUPDxq8Cu-z7gxfECN7T_6Djo8-oc76Y2CUSfK_hqWo2601yS_ckLJnScrkSz2wyQTnLF9SR2P-r3F44u0yROkXkx2pgAGyFtuTxWxkcz27j4KXSOvYCfjrVr2JT_nfHx78IjOhMLR3SAQzw3JY' },
    { id: '12', name: 'Gothic Manor', code: 'STG-012-GTH', visits: '780', occupancy: '2/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcIxjOFcg5yxUl71zxzLpxU3nFCMY9ovCeH_frksmcPx8OuwHdkHAMjwq0Fkc0X6eraX_Nrgyh3qdp2Q2XvYzwphOCV-0QMP4sv2MiYlsiJ00RedVfsN4aOsXxYGHnSvJMiFVokb3eeCNOdtvcBpiodw3cdu7Xr02XCpvXbfo32KnZK8SqXhl875vmTvIE5w2DEqR93o7t8YV2u9rRPJDcyUZcuNX2G9imbO3Dyrq6ykNS4jj6kD9HcCNLagKoO6m4R0gVpv16DtQ' },
    { id: '13', name: 'Candy Land', code: 'STG-013-CND', visits: '1,150', occupancy: '3/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt49is2pTtbyIsezh4UBXIrnF3ta7c_RDzSFe4OuwwePwvbMysShXHjominsNAlWSMcLlg1T-pQCDAJYNilqtgh9KLqnSxBqXZrX3IH8uehrGC6F0tY5ntMgjoANLCLeHm4VbkU37oKvSHB-09jbC4p9VRmxrohDchI2krdSGi68KlnxPe_B2YuaYFTUavz_-9XxsexRFydWZEmz4dcc9l1ATsCcxk7HzHZ1gKMTQT28DX3xDlWs7gb4jeZC0Neojw98ShlC6F2qA' },
    { id: '14', name: 'Wild West', code: 'STG-014-WST', visits: '995', occupancy: '2/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoXKAc-gU1e-tan1lQtVOp1O2l7-FGyWMIR18mD3j8fVoEUKsPsuy_7yvGrhPSXCVjipokJIQvrfTIXnPzP4Zh86Ghr7XnC_z4w1EEZyvmKjcRbM6Ke8ZdPMEVKkd39GQNmRj86aClDdqQYHN58lwMhtLKnBdXF3NiPpUiwLstLT7CNz3hx06Ry2YWcNlI-03Dyz_N2-ALBOQN4NfAPtm2kTVWCYMD4FI-_1ccyespB3rcGaqe8uVLFyo20qE8uLcfdnqyJpMoko0' },
    { id: '15', name: 'Zen Dojo', code: 'STG-015-ZEN', visits: '210', occupancy: '0/5', qr: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTW-vQBxCK_555XoNsm4UaHuKfzaFa-511dvFOxrVVSGhdTKvLD-49jpYFKTtfehcB816DEGwAXt2_p1unbG_0mWW3ukCU_sQkPZQdt8SMO7_KPApNOW6_VDbxK88Dfh6K1wk0IZl01k-mbnjas35DVNxgCdKAlTmAXEOugPEfqGOrfMo0rh8b4aNW5DJrn92bAa9nUl1SOEVlUpYtHIgWptfrZbX6gUtW0iIL8gTQ6MyYwSWsSMnIog9b_LyH91j_BCZJh6nVOto' },
];

const StageManager = () => {
    const { signOut } = useAuth();

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="stages"
            title="Stage Manager"
            onLogout={signOut}
            headerActions={
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-900/20">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Stage
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {STAGES.map((stage) => (
                    <div
                        key={stage.id}
                        className="group relative flex flex-col rounded-xl border border-white/5 bg-surface-dark p-4 transition-all hover:border-primary/30 hover:bg-surface-darker"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-bold text-white truncate pr-2">Stage {stage.id}: {stage.name}</h3>
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-xs font-bold text-gray-400">
                                {stage.id}
                            </span>
                        </div>

                        <div className="mb-4 flex-1 flex flex-col items-center justify-center rounded-lg bg-white p-4">
                            <img
                                alt={`QR Code for ${stage.name}`}
                                className="h-32 w-32 object-contain mix-blend-multiply opacity-90"
                                src={stage.qr}
                            />
                            <p className="mt-2 text-[10px] font-mono text-gray-500">{stage.code}</p>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-2">
                            <div className="rounded bg-surface-darker border border-white/5 p-2 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Visits</p>
                                <p className="text-lg font-bold text-white">{stage.visits}</p>
                            </div>
                            <div className="rounded bg-surface-darker border border-white/5 p-2 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500">Occupancy</p>
                                <p className={`text-lg font-bold ${stage.occupancy.startsWith('0') ? 'text-green-500' : 'text-primary'}`}>
                                    {stage.occupancy}
                                </p>
                            </div>
                        </div>

                        <button className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition-colors hover:bg-red-600">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Unduh
                        </button>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
};

export default StageManager;
