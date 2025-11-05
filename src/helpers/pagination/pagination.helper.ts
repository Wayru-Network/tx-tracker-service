// calculate offset for pagination
export const calcOffset = (page: number, limit: number) => {
    const realPage = page < 1 ? page : page - 1
    return realPage * limit
}

// calculate total pages for pagination
export const calcTotalPages = (totalDocuments: number, limit: number) => Number(Math.ceil(totalDocuments / limit))
