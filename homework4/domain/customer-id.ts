export class CustomerID {
    readonly id: string;
    
    constructor(id: string) {
        if (!id) {
            throw new Error('ID can not be empty');
        }

        this.id = id;
    }
}