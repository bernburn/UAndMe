export function photoError(file:{type:string;size:number}){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Choose a JPEG, PNG or WebP image.';
 if(file.size>2097152)return 'Choose an image smaller than 2 MB.';
 if(!file.size)return 'The image is empty.';
 return null;
}
