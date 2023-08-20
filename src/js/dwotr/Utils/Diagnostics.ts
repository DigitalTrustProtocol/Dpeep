class Diagnostics {

    events = new Map<string, Map<string, number>>();


    log(key: string, value: string) {
        if (!this.events.has(key)) {
            this.events.set(key, new Map<string, number>());
        }
        let map = this.events.get(key)!;
        if (!map.has(value)) {
            map.set(value, 0);
        }
        let count = map.get(value)!;
        map.set(value, count + 1);
    }

    printAll() {
        this.events.forEach((value, key) => {
            console.log(key);
            value.forEach((count, value) => {
                console.log(`  ${value}: ${count}`);
            });
        });
    }



}

const diagnostics = new Diagnostics();

export default diagnostics;

