import Is from '@pwn/is'

Is.use((Utilities, Is) => {
  Utilities.addPredicate( 'emptyArray' , (value) => Is.array(value) && value.length <= 0)  
})

export default Is