// calculate offset for pagination
export const calcOffset = (page: number, limit: number): number => {
    const realPage = page < 1 ? page : page - 1
    return realPage * limit
}

// calculate total pages for pagination
export const calcTotalPages = (totalDocuments: number, limit: number): number => Number(Math.ceil(totalDocuments / limit))
