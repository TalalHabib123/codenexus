


import * as path from 'path';
import { Rules } from '../../types/rulesets';

// export const shouldDetectFile = (filePath: string, rulesetsData: Rules, codeSmell: string): boolean => {
//     // If there's no rules data, don't detect anything
//     if (!rulesetsData) {
//         return false;
//     }

//     // First check if this code smell should be detected at all
//     if (Array.isArray(rulesetsData.detectSmells) && 
//         !rulesetsData.detectSmells.includes('*') && 
//         !rulesetsData.detectSmells.includes(codeSmell)) {
//         return false;
//     }

//     // Check if file is explicitly excluded
//     if (Array.isArray(rulesetsData.excludeFiles)) {
//         // Check string exclusions (exact filename)
//         if (rulesetsData.excludeFiles.some(exclude => 
//             typeof exclude === 'string' && 
//             (exclude === path.basename(filePath) || exclude === filePath)
//         )) {
//             return false;
//         }

//         // Check object exclusions (paths with specific smells)
//         for (const exclude of rulesetsData.excludeFiles) {
//             if (typeof exclude === 'object' && exclude !== null) {
//                 const excludePath = exclude.path;
//                 const excludeSmells = exclude.smells;
//                 console.log("excludePath", excludePath);
//                 console.log("filePath", filePath);
                
//                 // Match by path or filename
//                 const pathMatches = excludePath === filePath || 
//                                     excludePath === path.basename(filePath);
//                 console.log("pathMatches", pathMatches);
//                 if (pathMatches) {
//                     // If smells array is empty, no smells are excluded for this file
//                     if (!Array.isArray(excludeSmells) || excludeSmells.length === 0) {
//                         continue;
//                     }
                    
//                     // If * is in smells, all smells are excluded for this file
//                     if (excludeSmells.includes('*')) {
//                         return false;
//                     }
                    
//                     // If this specific smell is excluded
//                     if (excludeSmells.includes(codeSmell)) {
//                         return false;
//                     }
//                 }
//             }
//         }
//     }

//     // Check if file is explicitly included
//     if (Array.isArray(rulesetsData.includeFiles) && !rulesetsData.includeFiles.includes('*')) {
//         let isIncluded = false;
        
//         // Check string inclusions (exact filename)
//         if (rulesetsData.includeFiles.some(include => 
//             typeof include === 'string' && 
//             (include === path.basename(filePath) || include === filePath)
//         )) {
//             isIncluded = true;
//         }

//         // Check object inclusions (paths with specific smells)
//         for (const include of rulesetsData.includeFiles) {
//             if (typeof include === 'object' && include !== null) {
//                 const includePath = include.path;
//                 const includeSmells = include.smells;

//                 // Match by path or filename
//                 const pathMatches = includePath === filePath || 
//                                     includePath === path.basename(filePath);
                
//                 if (pathMatches) {
//                     // If smells array is empty, all smells are included for this file
//                     if (!Array.isArray(includeSmells) || includeSmells.length === 0) {
//                         isIncluded = true;
//                         break;
//                     }
                    
//                     // If * is in smells, all smells are included for this file
//                     if (includeSmells.includes('*')) {
//                         isIncluded = true;
//                         break;
//                     }
                    
//                     // If this specific smell is included
//                     if (includeSmells.includes(codeSmell)) {
//                         isIncluded = true;
//                         break;
//                     }
//                 }
//             }
//         }

//         if (!isIncluded) {
//             return false;
//         }
//     }

//     return true;
// };



export const shouldDetectFile = (filePath: string, rulesetsData: Rules, codeSmell: string): boolean => {
    // If there's no rules data, don't detect anything
    if (!rulesetsData) {
        return false;
    }

    // First check if this code smell should be detected at all
    if (Array.isArray(rulesetsData.detectSmells) && 
        !rulesetsData.detectSmells.includes('*') && 
        !rulesetsData.detectSmells.includes(codeSmell)) {
        return false;
    }

    // Check if includeFiles has specific entries or wildcard
    const hasWildcardInclude = Array.isArray(rulesetsData.includeFiles) && 
                               rulesetsData.includeFiles.includes('*');
    
    // If we don't have a wildcard include, we need to check if this file is explicitly included
    if (!hasWildcardInclude) {
        let isExplicitlyIncluded = false;
        
        if (Array.isArray(rulesetsData.includeFiles)) {
            // Check string inclusions (exact filename)
            if (rulesetsData.includeFiles.some(include => 
                typeof include === 'string' && 
                (include === path.basename(filePath) || include === filePath)
            )) {
                isExplicitlyIncluded = true;
            } else {
                // Check object inclusions (paths with specific smells)
                for (const include of rulesetsData.includeFiles) {
                    if (typeof include === 'object' && include !== null) {
                        const includePath = include.path;
                        const includeSmells = include.smells || [];
                        
                        // Match by path or filename
                        const pathMatches = includePath === filePath || 
                                            includePath === path.basename(filePath);
                        
                        if (pathMatches) {
                            console.log("PATH MATCHES", pathMatches);
                            console.log("INCLUDE PATH", includePath);
                            // If smells array is empty or includes *, all smells are included for this file
                            if (includeSmells.length === 0 || includeSmells.includes('*')) {
                                isExplicitlyIncluded = true;
                                break;
                            }
                            console.log("INCLUDE SMELLS", includeSmells);
                            console.log("CODE SMELL", codeSmell);
                            // If this specific smell is included
                            if (includeSmells.includes(codeSmell)) {
                                
                                isExplicitlyIncluded = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // If the file is not explicitly included and there's no wildcard,
        // then we should not detect this file
        if (!isExplicitlyIncluded) {
            return false;
        }
    }

    // Check if file is explicitly excluded
    if (Array.isArray(rulesetsData.excludeFiles)) {
        // Check string exclusions (exact filename)
        if (rulesetsData.excludeFiles.some(exclude => 
            typeof exclude === 'string' && 
            (exclude === path.basename(filePath) || exclude === filePath)
        )) {
            return false;
        }

        // Check object exclusions (paths with specific smells)
        for (const exclude of rulesetsData.excludeFiles) {
            if (typeof exclude === 'object' && exclude !== null) {
                const excludePath = exclude.path;
                const excludeSmells = exclude.smells || [];

                // Match by path or filename
                const pathMatches = excludePath === filePath || 
                                    excludePath === path.basename(filePath);
                
                if (pathMatches) {
                    // If smells array is empty, no smells are excluded for this file
                    if (excludeSmells.length === 0) {
                        continue;
                    }
                    
                    // If * is in smells, all smells are excluded for this file
                    if (excludeSmells.includes('*')) {
                        return false;
                    }
                    
                    // If this specific smell is excluded
                    if (excludeSmells.includes(codeSmell)) {
                        return false;
                    }
                }
            }
        }
    }

    return true;
};
