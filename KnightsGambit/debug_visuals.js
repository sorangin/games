
// DEBUG: Check why BloodCaller/Witchdoctor are invisible
function debugUnitVisuals() {
    const unitsToCheck = units.filter(u => u.type === 'goblin_blood_caller' || u.type === 'goblin_witchdoctor');
    unitsToCheck.forEach(u => {
        const data = UNIT_DATA[u.type];
        const sheetConfig = SPRITESHEET_CONFIG[data.useSpritesheet];
        const row = sheetConfig.unitRows[u.type];
        console.log(`Unit: ${u.type}, ID: ${u.id}`);
        console.log(`  UseSpritesheet: ${data.useSpritesheet}`);
        console.log(`  Row defined: ${row}`);
        console.log(`  Variant: ${u.variantType || u.spriteVariant}`);
        const styles = getSpritePositionStyles(u.type, 'idle', u.variantType || 'green');
        console.log(`  Styles:`, styles);
        if (u.element) {
            console.log(`  DOM Filter: ${u.element.style.filter}`);
            console.log(`  DOM BG: ${u.element.style.backgroundImage}`);
            console.log(`  DOM Classes: ${u.element.className}`);
        }
    });
}
window.debugUnitVisuals = debugUnitVisuals;
